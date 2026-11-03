import type { ReactNode } from "react";

type DocPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export default function DocPage({ eyebrow, title, intro, children }: DocPageProps) {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{intro}</p>
      <div className="mt-8 grid gap-6">{children}</div>
    </div>
  );
}

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 grid gap-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}
