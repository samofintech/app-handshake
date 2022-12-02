'use strict';

const contextPath = '/handshake';
const Devebot = require('devebot');
const chores = Devebot.require('chores');

module.exports = {
  application: {
    contextPath: contextPath,
  },
  plugins: {
    appHandshake: {
      otpExpiredIn: 15 * 60,
      otpTypingTime: 5 * 60,
      otpSize: 4,
      rejectUnknownUser: true,
      createIfUserNotFound: function ({ schemaVersion }) {
        return chores.isVersionGTE(schemaVersion, "1.1.0");
      },
      secretKey: 'dobietday',
      revisions: {
        serviceEntrypoints: '2019-01-01T00:00:00.000Z'
      }
    },
    appRestfront: {
      contextPath: contextPath,
      apiPath: '',
      requestOptions: {
        requestId: {
          headerName: 'X-Request-Id',
          optionName: 'requestId',
          required: true,
        },
        schemaVersion: {
          headerName: 'X-Schema-Version',
          required: false,
        },
      },
    },
    appDatastore: {
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
            name: "demo"
          }
        }
      }
    }
  }
};
