'use strict';

var contextPath = '/handshake';

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
      secretKey: 'dobietday',
      revisions: {
        serviceEntrypoints: '2019-01-01T00:00:00.000Z'
      }
    },
    appRestfront: {
      contextPath: contextPath,
      apiPath: ''
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
