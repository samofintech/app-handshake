'use strict';

var path = require('path');

var app = require('devebot').launchApplication({
  appRootPath: __dirname
}, [
  {
    name: 'app-handshake',
    path: path.join(__dirname, '../../index.js')
  }
]);

if (require.main === module) {
  const stop = function() {
    app.server.stop().then(function () {
      console.log("The server has been stopped.");
      process.exit(0);
    });
  }
  app.server.start().finally(function() {
    process.on('SIGINT', stop);
    process.on('SIGQUIT', stop);
    process.on('SIGTERM', stop);
  });
}

module.exports = app;
