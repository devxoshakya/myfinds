"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "span" | "ul";
};

export function useInView<T extends Element>(threshold = 0.18) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, seen] as const;
}

export default function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const [ref, seen] = useInView<HTMLDivElement>(0.1);
  const Tag = as;
  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    <Tag
      ref={ref as never}
      className={`mf-reveal${className ? ` ${className}` : ""}`}
      data-visible={seen || undefined}
      style={style}
    >
      {children}
    </Tag>
  );
}
