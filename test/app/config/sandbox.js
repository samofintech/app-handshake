'use strict';

var contextPath = '/handshake';

module.exports = {
  application: {
    contextPath: contextPath,
  },
  plugins: {
    appHandshake: {
      contextPath: contextPath,
      expiredIn: 15 * 60,
      expiredMargin: 5 * 60,
      otpSize: 4,
      secretkey: 'dobietday',
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
            name: "momi"
          }
        }
      }
    }
  }
};
