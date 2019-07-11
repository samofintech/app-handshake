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
      rejectUnknownUser: false,
      secretKey: 'dobietday',
    },
    appRestfront: {
      contextPath: contextPath,
      apiPath: '',
      apiVersion: ''
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
