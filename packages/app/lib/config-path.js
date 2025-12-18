const path = require('path');

const DEFAULT_CONFIG_NAME = 'canopy.yml';

function resolveWorkspaceRoot(options = {}) {
  const rawCwd = options && options.cwd ? String(options.cwd).trim() : '';
  if (rawCwd) return path.resolve(rawCwd);
  const initCwd = String(process.env.INIT_CWD || '').trim();
  if (initCwd) return path.resolve(initCwd);
  return process.cwd();
}

function resolveCanopyConfigPath(options = {}) {
  const root = resolveWorkspaceRoot(options);
  const explicit = options && options.configPath ? String(options.configPath).trim() : '';
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(root, explicit);
  }
  const override = options && options.configFile ? String(options.configFile).trim() : '';
  const envOverride = String(process.env.CANOPY_CONFIG || '').trim();
  const fileName = override || envOverride || DEFAULT_CONFIG_NAME;
  return path.resolve(root, fileName);
}

module.exports = {
  resolveWorkspaceRoot,
  resolveCanopyConfigPath,
};
