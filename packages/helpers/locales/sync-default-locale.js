#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SOURCE_PATH = path.resolve('content/locale.yml');
const TARGET_PATH = path.resolve('packages/app/lib/default-locale.js');
const HEADER = `/**
 * This file is auto-generated from content/locale.yml.
 * Run \`node packages/helpers/locales/sync-default-locale.js\` after updating locale copy.
 */`;

function readLocaleFile() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Missing locale source file at ${SOURCE_PATH}`);
  }
  const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
  if (!raw.trim()) {
    throw new Error('content/locale.yml is empty.');
  }
  const data = yaml.load(raw);
  if (!data || typeof data !== 'object') {
    throw new Error('content/locale.yml did not produce an object.');
  }
  return data;
}

function escapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function serialize(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const items = value.map((entry) => `${pad}  ${serialize(entry, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (!keys.length) return '{}';
    const lines = keys.map(
      (key) => `${pad}  ${key}: ${serialize(value[key], indent + 1)}`
    );
    return `{\n${lines.join(',\n')}\n${pad}}`;
  }
  if (typeof value === 'string') {
    return `'${escapeString(value)}'`;
  }
  return String(value);
}

function writeModule(data) {
  const serialized = serialize(data, 0).replace(/^ /, '');
  const trimmed = serialized.trimStart();
  const contents = `${HEADER}\nmodule.exports = ${trimmed};\n`;
  fs.writeFileSync(TARGET_PATH, contents, 'utf8');
}

function main() {
  try {
    const data = readLocaleFile();
    writeModule(data);
    console.log(`Updated ${path.relative(process.cwd(), TARGET_PATH)} from content/locale.yml`);
  } catch (error) {
    console.error('[sync-default-locale] failed:', error.message || error);
    process.exit(1);
  }
}

main();
