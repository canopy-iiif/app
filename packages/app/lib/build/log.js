let charm = null;
try {
  charm = require('charm')();
} catch (_) {
  charm = null;
}

const ANSI = {
  reset: '\u001b[0m',
  bright: '\u001b[1m',
  dim: '\u001b[2m',
  underscore: '\u001b[4m',
  colors: {
    black: '\u001b[30m',
    red: '\u001b[31m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    blue: '\u001b[34m',
    magenta: '\u001b[35m',
    cyan: '\u001b[36m',
    white: '\u001b[37m'
  }
};

function log(string, color = 'blue', options = { bright: false, dim: false, underscore: false }) {
  if (charm) {
    const c = require('charm')();
    c.pipe(process.stdout);
    if (options?.bright) c.display('bright');
    if (options?.dim) c.display('dim');
    if (options?.underscore) c.display('underscore');
    c.foreground(color).write(String(string)).display('reset');
    c.end();
  } else {
    const parts = [];
    if (options?.bright) parts.push(ANSI.bright);
    if (options?.dim) parts.push(ANSI.dim);
    if (options?.underscore) parts.push(ANSI.underscore);
    const clr = ANSI.colors[color] || '';
    parts.push(clr);
    parts.push(String(string));
    parts.push(ANSI.reset);
    process.stdout.write(parts.join(''));
  }
}

function logLine(string, color = 'blue', options) {
  log(string + '\n', color, options);
}

function logResponse(string, response, success = true) {
  if (success) {
    log('✓ ', 'yellow', { dim: true });
    log(String(string), 'yellow');
    log(` ➜ ${response?.status ?? ''}\n`, 'yellow', { dim: true });
  } else {
    log('✗ ', 'red', { dim: true });
    log(String(string), 'red');
    log(` ➜ ${response?.status ?? ''}\n`, 'red', { dim: true });
  }
}

module.exports = { log, logLine, logResponse };

