const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_NAME = 'canopy.yml';

function toAbsolute(value) {
  if (!value && value !== 0) return '';
  const stringValue = String(value).trim();
  if (!stringValue) return '';
  try {
    return path.resolve(stringValue);
  } catch (_) {
    return '';
  }
}

function fileExists(p) {
  try {
    return !!(p && fs.existsSync(p));
  } catch (_) {
    return false;
  }
}

function isConfigPresent(root, fileName) {
  if (!root) return false;
  const candidate = path.resolve(root, fileName);
  return fileExists(candidate);
}

function resolveWorkspaceRoot(options = {}) {
  const candidates = [];
  if (options && options.cwd) candidates.push(options.cwd);
  candidates.push(process.env.INIT_CWD || '');
  candidates.push(process.env.GITHUB_WORKSPACE || '');
  candidates.push(process.cwd());

  const seen = new Set();
  for (const raw of candidates) {
    const abs = toAbsolute(raw);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    if (fileExists(abs)) return abs;
  }
  return process.cwd();
}

function resolveCanopyConfigPath(options = {}) {
  const explicit = options && options.configPath ? String(options.configPath).trim() : '';
  const override = options && options.configFile ? String(options.configFile).trim() : '';
  const envOverride = String(process.env.CANOPY_CONFIG || '').trim();
  const fileName = override || envOverride || DEFAULT_CONFIG_NAME;

  const roots = [];
  const primaryRoot = resolveWorkspaceRoot(options);
  if (primaryRoot) roots.push(primaryRoot);
  const cwdFallback = toAbsolute(process.cwd());
  if (cwdFallback && !roots.includes(cwdFallback)) roots.push(cwdFallback);
  const githubWorkspace = toAbsolute(process.env.GITHUB_WORKSPACE || '');
  if (githubWorkspace && !roots.includes(githubWorkspace)) roots.push(githubWorkspace);

  if (explicit) {
    const base = roots[0] || process.cwd();
    return path.isAbsolute(explicit) ? explicit : path.resolve(base, explicit);
  }

  for (const root of roots) {
    if (isConfigPresent(root, fileName)) return path.resolve(root, fileName);
  }

  const fallbackRoot = roots[0] || process.cwd();
  return path.resolve(fallbackRoot, fileName);
}

module.exports = {
  resolveWorkspaceRoot,
  resolveCanopyConfigPath,
};
