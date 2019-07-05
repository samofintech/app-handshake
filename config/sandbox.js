'use strict';

var path = require('path');

module.exports = {
  plugins: {
    appHandshake: {
    },
    appRestfront: {
      mappingStore: {
        "handshake-restfront": path.join(__dirname, '../lib/mappings/restfront')
      }
    },
    appDatastore: {
      mappingStore: {
        "handshake-datastore": path.join(__dirname, '../lib/mappings/datastore')
      }
    }
  },
  bridges: {
    mongoose: {
      appDatastore: {
        manipulator: {
          connection_options: {
            host: "127.0.0.1",
            port: "27017",
            name: "handshake"
          }
        }
      }
    }
  }
};
