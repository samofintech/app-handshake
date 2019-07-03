'use strict';

var path = require('path');
var contextPath = '/handshake';

module.exports = {
  application: {
    contextPath: contextPath,
  },
  plugins: {
    appDatastore: {
    },
    appHandshake: {
      contextPath: contextPath,
    },
    appRestfront: {
      contextPath: contextPath,
      apiPath: '',
      apiVersion: '',
      mappingStore: path.join(__dirname, '../lib/mappings/req-to-rpc')
    },
    appTracelog: {
      tracingRequestName: 'requestId',
      tracingRequestHeader: 'X-Request-Id',
      tracingPaths: [ contextPath ],
      tracingBoundaryEnabled: true,
    },
    appWebweaver: {
    }
  },
  bridges: {
    mongoose: {
      appDatastore: {
        manipulator: {
          connection_options: {
            host: "127.0.0.1",
            port: "27017",
            name: "momi"
          }
        }
      }
    }
  }
};
