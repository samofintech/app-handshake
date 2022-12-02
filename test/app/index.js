'use strict';

const path = require('path');

const app = require('devebot').launchApplication({
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
  process.on('SIGINT', stop);
  process.on('SIGQUIT', stop);
  process.on('SIGTERM', stop);
  app.server.start();
}

module.exports = app;
