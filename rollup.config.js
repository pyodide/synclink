import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

function config({ format, minify, input, ext = "js" }) {
  const dir = `dist/${format}/`;
  const minifierSuffix = minify ? ".min" : "";
  return {
    input: `./src/${input}.ts`,
    output: {
      name: "Synclink",
      file: `${dir}/${input}${minifierSuffix}.${ext}`,
      format,
      sourcemap: true,
    },
    plugins: [
      typescript({
        clean: true,
        typescript: require("typescript"),
        tsconfigOverride: {
          compilerOptions: {
            sourceMap: true,
          },
          // Don’t ask. Without this, the typescript plugin is convinced
          // to create subfolders and misplace the .d.ts files.
          files: ["./src/synclink.ts", "./src/protocol.ts"],
        },
      }),
      minify
        ? terser({
            compress: true,
            mangle: false,
          })
        : undefined,
    ].filter(Boolean),
  };
}

require("rimraf").sync("dist");

export default [
  { input: "synclink", format: "esm", minify: false, ext: "mjs" },
  { input: "synclink", format: "esm", minify: true, ext: "mjs" },
  { input: "synclink", format: "esm", minify: false },
  { input: "synclink", format: "esm", minify: true },
  { input: "synclink", format: "umd", minify: false },
  { input: "synclink", format: "umd", minify: true },
].map(config);
