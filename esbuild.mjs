import { build } from "esbuild";
import rimraf from "rimraf";
rimraf.sync("dist");

function config({ format, minify, ext = "js" }) {
  const dir = `dist/${format}/`;
  const minifierSuffix = minify ? ".min" : "";
  const globalName = format === "iife" ? "Synclink" : undefined;
  return build({
    entryPoints: [`./src/synclink.ts`],
    outfile: `${dir}/synclink${minifierSuffix}.${ext}`,
    bundle: true,
    minify,
    keepNames: true,
    sourcemap: true,
    format,
    globalName,
  });
}

[
  { format: "esm", minify: false, ext: "mjs" },
  { format: "esm", minify: true, ext: "mjs" },
  { format: "iife", minify: false },
  { format: "iife", minify: true },
  { format: "cjs", minify: false },
  { format: "cjs", minify: true },
].map(config);
