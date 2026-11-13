// Vercel serverless entrypoint. @vercel/node wraps this default export as the
// HTTP handler for every request rewritten here by vercel.json.
import { app } from "../src/app";

export default app;
