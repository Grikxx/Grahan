// Bundles the AI Web Worker (and the engine it uses) into public/ai-worker.js.
// Runs automatically before `npm run dev` and `npm run build`.
import { build, context } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const options = {
  entryPoints: [path.join(root, "src/workers/ai.worker.ts")],
  outfile: path.join(root, "public/ai-worker.js"),
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: true,
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
