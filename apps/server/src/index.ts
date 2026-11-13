import { app } from "./app";

// On Vercel the framework builds src/app.ts (default export) as the handler;
// only bind a local port when running standalone (bun dev / docker / bare node).
if (process.env.VERCEL !== "1") {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export { app as default };
