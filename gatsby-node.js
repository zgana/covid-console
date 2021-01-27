const express = require(`express`);

// Serve files from `static` in development
exports.onCreateDevServer = ({ app }) => {
  app.use(express.static("static"))
}
