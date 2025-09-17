const {
  fs,
  fsp,
  path,
  OUT_DIR,
  CONTENT_DIR,
  ensureDirSync,
} = require("../common");

async function ensureStyles() {
  const stylesDir = path.join(OUT_DIR, "styles");
  const dest = path.join(stylesDir, "styles.css");
  const customContentCss = path.join(CONTENT_DIR, "_styles.css");
  const appStylesDir = path.join(process.cwd(), "app", "styles");
  const customAppCss = path.join(appStylesDir, "index.css");
  ensureDirSync(stylesDir);

  const root = process.cwd();
  const twConfigsRoot = [
    path.join(root, "tailwind.config.js"),
    path.join(root, "tailwind.config.cjs"),
    path.join(root, "tailwind.config.mjs"),
    path.join(root, "tailwind.config.ts"),
  ];
  const twConfigsApp = [
    path.join(appStylesDir, "tailwind.config.js"),
    path.join(appStylesDir, "tailwind.config.cjs"),
    path.join(appStylesDir, "tailwind.config.mjs"),
    path.join(appStylesDir, "tailwind.config.ts"),
  ];
  let configPath = [...twConfigsApp, ...twConfigsRoot].find((p) => {
    try {
      return fs.existsSync(p);
    } catch (_) {
      return false;
    }
  });
  if (!configPath) {
    try {
      const { CACHE_DIR } = require("../common");
      const genDir = path.join(CACHE_DIR, "tailwind");
      ensureDirSync(genDir);
      const genCfg = path.join(genDir, "tailwind.config.js");
      const cfg = `module.exports = {\n  presets: [require('@canopy-iiif/app/ui/canopy-iiif-preset')],\n  content: [\n    './content/**/*.{mdx,html}',\n    './site/**/*.html',\n    './site/**/*.js',\n    './packages/app/ui/**/*.{js,jsx,ts,tsx}',\n    './packages/app/lib/iiif/components/**/*.{js,jsx}',\n  ],\n  theme: { extend: {} },\n  plugins: [require('@canopy-iiif/app/ui/canopy-iiif-plugin')],\n};\n`;
      fs.writeFileSync(genCfg, cfg, "utf8");
      configPath = genCfg;
    } catch (_) {
      configPath = null;
    }
  }

  const inputCss = fs.existsSync(customAppCss)
    ? customAppCss
    : fs.existsSync(customContentCss)
    ? customContentCss
    : null;

  let generatedInput = null;
  if (!inputCss) {
    try {
      const { CACHE_DIR } = require("../common");
      const genDir = path.join(CACHE_DIR, "tailwind");
      ensureDirSync(genDir);
      generatedInput = path.join(genDir, "index.css");
      const css = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
      fs.writeFileSync(generatedInput, css, "utf8");
    } catch (_) {
      generatedInput = null;
    }
  }

  function resolveTailwindCli() {
    try {
      const cliJs = require.resolve("tailwindcss/lib/cli.js");
      return { cmd: process.execPath, args: [cliJs] };
    } catch (_) {}
    try {
      const localBin = path.join(
        process.cwd(),
        "node_modules",
        ".bin",
        process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss"
      );
      if (fs.existsSync(localBin)) return { cmd: localBin, args: [] };
    } catch (_) {}
    return null;
  }
  function buildTailwindCli({ input, output, config, minify = true }) {
    try {
      const cli = resolveTailwindCli();
      if (!cli) return false;
      const { spawnSync } = require("child_process");
      const args = ["-i", input, "-o", output];
      if (config) args.push("-c", config);
      if (minify) args.push("--minify");
      const res = spawnSync(cli.cmd, [...cli.args, ...args], {
        stdio: "inherit",
        env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
      });
      return !!res && res.status === 0;
    } catch (_) {
      return false;
    }
  }

  if (configPath && (inputCss || generatedInput)) {
    const ok = buildTailwindCli({
      input: inputCss || generatedInput,
      output: dest,
      config: configPath,
      minify: true,
    });
    if (ok) return; // Tailwind compiled CSS
  }

  function isTailwindSource(p) {
    try {
      const s = fs.readFileSync(p, "utf8");
      return /@tailwind\s+(base|components|utilities)/.test(s);
    } catch (_) {
      return false;
    }
  }
  if (fs.existsSync(customAppCss)) {
    if (!isTailwindSource(customAppCss)) {
      await fsp.copyFile(customAppCss, dest);
      return;
    }
  }
  if (fs.existsSync(customContentCss)) {
    if (!isTailwindSource(customContentCss)) {
      await fsp.copyFile(customContentCss, dest);
      return;
    }
  }

  const css = `:root{--max-w:760px;--muted:#6b7280}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;max-width:var(--max-w);margin:2rem auto;padding:0 1rem;line-height:1.6}a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}.site-header,.site-footer{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:1rem 0;border-bottom:1px solid #e5e7eb}.site-footer{border-bottom:0;border-top:1px solid #e5e7eb;color:var(--muted)}.brand{font-weight:600}.content pre{background:#f6f8fa;padding:1rem;overflow:auto}.content code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#f6f8fa;padding:.1rem .3rem;border-radius:4px}.tabs{display:flex;gap:.5rem;align-items:center;border-bottom:1px solid #e5e7eb;margin:.5rem 0}.tab{background:none;border:0;color:#374151;padding:.25rem .5rem;border-radius:.375rem;cursor:pointer}.tab:hover{color:#111827}.tab-active{color:#2563eb;border:1px solid #e5e7eb;border-bottom:0;background:#fff}.masonry{column-gap:1rem;column-count:1}@media(min-width:768px){.masonry{column-count:2}}@media(min-width:1024px){.masonry{column-count:3}}.masonry>*{break-inside:avoid;margin-bottom:1rem;display:block}[data-grid-variant=masonry]{column-gap:var(--grid-gap,1rem);column-count:var(--cols-base,1)}@media(min-width:768px){[data-grid-variant=masonry]{column-count:var(--cols-md,2)}}@media(min-width:1024px){[data-grid-variant=masonry]{column-count:var(--cols-lg,3)}}[data-grid-variant=masonry]>*{break-inside:avoid;margin-bottom:var(--grid-gap,1rem);display:block}[data-grid-variant=grid]{display:grid;grid-template-columns:repeat(var(--cols-base,1),minmax(0,1fr));gap:var(--grid-gap,1rem)}@media(min-width:768px){[data-grid-variant=grid]{grid-template-columns:repeat(var(--cols-md,2),minmax(0,1fr))}}@media(min-width:1024px){[data-grid-variant=grid]{grid-template-columns:repeat(var(--cols-lg,3),minmax(0,1fr))}}`;
  await fsp.writeFile(dest, css, "utf8");
}

module.exports = { ensureStyles };
