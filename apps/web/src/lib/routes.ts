import type { Route } from "next";

/**
 * Typed-route helpers for report pages. `typedRoutes` only accepts literal
 * route strings, so dynamic report paths are narrowed here in one place.
 */
export const reportPath = (id: string) => `/reports/${id}` as Route;

export const matchesPath = (id: string) => `/reports/${id}/matches` as Route;
