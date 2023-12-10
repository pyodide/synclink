import { build } from "esbuild";

function config({ format, minify, input, ext = "js" }) {
  const dir = `dist/${format}/`;
  const minifierSuffix = minify ? ".min" : "";
  const globalName = format === "iife" ? "Synclink" : undefined;
  return build({
    entryPoints: [`./src/${input}.ts`],
    outfile: `${dir}/${input}${minifierSuffix}.${ext}`,
    bundle: true,
    minify,
    keepNames: true,
    sourcemap: true,
    format,
    globalName,
  });
}

[
  { input: "synclink", format: "esm", minify: false, ext: "mjs" },
  { input: "synclink", format: "esm", minify: true, ext: "mjs" },
  { input: "synclink", format: "iife", minify: false },
  { input: "synclink", format: "iife", minify: true },
  { input: "synclink", format: "cjs", minify: false },
  { input: "synclink", format: "cjs", minify: true },
  { input: "node-adapter", format: "esm", minify: false, ext: "mjs" },
  { input: "node-adapter", format: "esm", minify: true, ext: "mjs" },
  { input: "node-adapter", format: "cjs", minify: false },
  { input: "node-adapter", format: "cjs", minify: true },
].map(config);
