// Build step for the Vercel function (see vercel.json buildCommand).
//
// Bun's isolated linker links workspace packages (@myfinds/*) as symlinks and
// Vercel's packer strips symlinks from the deployment, so at runtime the
// function cannot resolve `@myfinds/*`. This replaces each symlink with a
// real, self-contained copy of the package:
//   - every symlink dereferenced (nested deps included)
//   - nested @myfinds links removed (bare imports resolve up the tree)
//   - sources compiled to CommonJS .js with .d.ts declarations
//   - all TypeScript pruned, so the deploy ships pure JS
// The sources in packages/ stay untouched.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Run from the repo root: with the hoisted linker, all npm deps and the
// @myfinds workspace links live in the root node_modules — the same place
// runtime resolution lands inside the deployed function.
process.chdir(join(import.meta.dirname, "../../.."));

const SRC_EMIT = {
  extends: "./tsconfig.json",
  compilerOptions: {
    noEmit: false,
    module: "commonjs",
    verbatimModuleSyntax: false,
    declaration: true,
    emitDeclarationOnly: false,
  },
  include: ["src/**/*.ts"],
  exclude: ["src/**/*.test.ts", "node_modules"],
};
const GENERATED_EMIT = {
  compilerOptions: {
    noEmit: false,
    module: "commonjs",
    target: "ES2022",
    moduleResolution: "node10",
    ignoreDeprecations: "6.0",
    esModuleInterop: true,
    skipLibCheck: true,
    declaration: true,
    types: [],
  },
  include: ["prisma/generated/**/*.ts"],
};

function run(cmd, cwd) {
  const res = spawnSync("bun", ["x", ...cmd], { cwd, stdio: "inherit" });
  if (res.status !== 0) {
    console.error(`command failed in ${cwd}: bun x ${cmd.join(" ")}`);
    process.exit(1);
  }
}

// Remove every .ts/.tsx file under dir (the copies ship as pure JS).
function pruneTs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      pruneTs(p);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      // Keep declaration files — they carry the types for the shipped .js.
      if (entry.name.endsWith(".d.ts")) continue;
      rmSync(p);
    }
  }
}

const NAMES = ["auth", "db", "shared"];

// Pass 1: replace every workspace link with a real, dereferenced copy and
// normalize it (CommonJS package.json, no nested @myfinds, no broken .bin).
for (const name of NAMES) {
  const link = `node_modules/@myfinds/${name}`;
  const real = join("packages", name);
  if (!existsSync(join(real, "package.json"))) {
    console.error(`missing ${real}/package.json`);
    process.exit(1);
  }
  rmSync(link, { recursive: true, force: true });
  cpSync(real, link, { recursive: true, dereference: true });
  // The runtime must treat the copy's compiled .js as CommonJS regardless
  // of how the source package is configured.
  const pkgPath = `${link}/package.json`;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.type = "commonjs";
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  // Workspace deps resolve up the tree to the top-level copies — keep a
  // single copy of each package so types and runtime stay consistent.
  rmSync(`${link}/node_modules/@myfinds`, { recursive: true, force: true });
  // Dereferenced .bin shims are broken outside their original layout.
  rmSync(`${link}/node_modules/.bin`, { recursive: true, force: true });
}

// Pass 2: better-auth ships ESM-only (.mjs) and Vercel's function runtime
// rejects require() of ES modules. Compile the subpaths this function needs
// to CommonJS and register them under the "require" export condition, so
// runtime require() finds CJS while ESM consumers are unaffected.
const BETTER_AUTH_TARGETS = [
  ["dist/index.mjs", "dist/index.cjs", "."],
  ["dist/integrations/node.mjs", "dist/integrations/node.cjs", "./node"],
  ["dist/adapters/prisma-adapter/index.mjs", "dist/adapters/prisma-adapter/index.cjs", "./adapters/prisma"],
];
const baDir = "node_modules/better-auth";
const baPkgPath = `${baDir}/package.json`;
const baPkg = JSON.parse(readFileSync(baPkgPath, "utf8"));
let baPatched = false;
for (const [src, out, sub] of BETTER_AUTH_TARGETS) {
  const cjsPath = `${baDir}/${out}`;
  const entry = baPkg.exports?.[sub];
  if (existsSync(cjsPath) && Object.keys(entry ?? {})[0] === "require" && entry.require === `./${out}`) continue;
  if (!existsSync(cjsPath)) {
    run(["esbuild", `${baDir}/${src}`, "--bundle", "--platform=node", "--format=cjs", `--outfile=${cjsPath}`, "--log-level=warning"], ".");
  }
  // Node walks exports keys in insertion order and "default" is always
  // active — the require condition must come first or it is never reached.
  baPkg.exports[sub] = { require: `./${out}`, ...entry };
  baPatched = true;
}
if (baPatched) {
  writeFileSync(baPkgPath, JSON.stringify(baPkg, null, 2) + "\n");
  console.log("better-auth: registered CJS builds for require()");
}
// Pass 3: compile every copy now that all of them are in place — emits may
// resolve types from the sibling copies.
for (const name of NAMES) {
  const link = `node_modules/@myfinds/${name}`;
  // Compile sources and (for db) the generated client to CJS .js + .d.ts.
  writeFileSync(`${link}/tsconfig.emit.json`, JSON.stringify(SRC_EMIT, null, 2));
  run(["tsc", "-p", "tsconfig.emit.json"], link);
  if (name === "db" && existsSync(`${link}/prisma/generated/client.ts`)) {
    writeFileSync(`${link}/tsconfig.generated-emit.json`, JSON.stringify(GENERATED_EMIT, null, 2));
    run(["tsc", "-p", "tsconfig.generated-emit.json"], link);
    // Prisma's generated code carries an ESM `import.meta.url` shim for
    // __dirname; tsc cannot rewrite import.meta, so patch the line to the
    // CJS-native value (same directory as the file itself).
    for (const entry of readdirSync(`${link}/prisma/generated`, { withFileTypes: true })) {
      if (entry.isDirectory() || !entry.name.endsWith(".js")) continue;
      const p = join(`${link}/prisma/generated`, entry.name);
      const src = readFileSync(p, "utf8");
      if (!src.includes("import.meta")) continue;
      writeFileSync(p, src.replace(/^.*import\.meta\.url.*$/m, "globalThis['__dirname'] = __dirname;"));
    }
  }
  // Ship pure JS: sources, tests and configs are not needed at runtime.
  pruneTs(link);
  for (const f of ["tsconfig.json", "tsconfig.emit.json", "tsconfig.generated-emit.json", "prisma.config.ts", "prisma/seed.ts"]) {
    rmSync(`${link}/${f}`, { force: true });
  }
  console.log(`materialized ${link} (commonjs js+d.ts, sources pruned)`);
}
