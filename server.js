"use strict";

const path = require("path");

const app = require("devebot").launchApplication({
  appRootPath: __dirname
}, [{
  name: "app-handshake",
  path: path.join(__dirname, "index.js")
}]);

if (require.main === module) app.server.start();

module.exports = app;
