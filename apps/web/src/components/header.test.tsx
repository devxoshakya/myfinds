// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: null,
      isPending: false,
    }),
  },
}));

vi.mock("./user-menu", () => ({
  default: () => null,
}));

import Header from "./header";

describe("Header", () => {
  afterEach(() => {
    cleanup();
    pathname = "/";
  });

  it("does not change hook count when navigating to an auth page", () => {
    const view = render(<Header />);

    pathname = "/login";
    expect(() => view.rerender(<Header />)).not.toThrow();
  });
});
