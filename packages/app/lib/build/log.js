const charm = require("charm")();
charm.pipe(process.stdout);

function log(string, color = "blue", options = { bright: false, dim: false, underscore: false }) {
  if (options?.bright) charm.display("bright");
  if (options?.dim) charm.display("dim");
  if (options?.underscore) charm.display("underscore");
  charm.foreground(color).write(String(string)).display("reset");
}

function logLine(string, color = "blue", options) {
  log(string + "\n", color, options);
}

function logResponse(string, response, success = true) {
  if (success) {
    log("✓ ", "yellow", { dim: true });
    log(String(string), "yellow");
    log(` ➜ ${response?.status ?? ""}\n`, "yellow", { dim: true });
  } else {
    log("✗ ", "red", { dim: true });
    log(String(string), "red");
    log(` ➜ ${response?.status ?? ""}\n`, "red", { dim: true });
  }
}

module.exports = { log, logLine, logResponse };
