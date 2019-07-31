'use strict';

var lodash = Devebot.require('lodash');

var mappings = [
  {
    path: ['/auth/login', '/auth/login/:appType'],
    method: 'POST',
    input: {
      transform: function(req) {
        return {
          appType: extractAppType(req),
          data: req.body
        }
      },
      schema: {},
      validate: function(data) {
        return true;
      },
      examples: [
        {
          path: '/auth/login',
          body: {
            "appType": "agent",
            "version": "1.0.0",
            "org": "E621E1F8-C36C-495A-93FC-0C247A3E6FGG",
            "device": {
              "imei": "990000862471854",
              "platform": "iOS"
            },
            "phoneNumber": "+12055555555",
            "phone": {
              "country": "US",
              "countryCode": "+1",
              "number": "2055555555"
            }
          }
        },
        {
          path: "/auth/login/admin",
          body: {
            "username": "adm",
            "password": "changeme",
          }
        },
      ]
    },
    serviceName: 'app-handshake/handler',
    methodName: 'register',
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: lodash.get(result, "data")
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
  },
  {
    path: '/auth/verification-code',
    method: 'POST',
    input: {
      transform: function(req) {
        return {
          data: req.body
        }
      },
      examples: [
        {
          path: '/auth/verification-code',
          body: {
            key: "UqR32OQ3S4arU3KalHbz9A",
            otp: "1543"
          }
        }
      ],
    },
    serviceName: 'app-handshake/handler',
    methodName: 'verificationCode',
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: lodash.get(result, "data")
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
  },
  {
    path: ['/auth/refresh-token', '/auth/refresh-token/:appType'],
    method: 'POST',
    input: {
      transform: function(req) {
        return {
          appType: extractAppType(req),
          data: req.body
        }
      },
    },
    serviceName: 'app-handshake/handler',
    methodName: 'refreshToken',
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: lodash.get(result, "data")
        };
        return payload;
      },
    },
    error: {
      transform: transformError,
    }
  },
  {
    path: ['/auth/revoke-token', '/auth/revoke-token/:appType'],
    method: 'POST',
    input: {
      examples: [
        {
          path: '/auth/revoke-token',
          body: {
            phoneNumber: '+84999999999'
          }
        }
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          data: req.body
        }
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'revokeToken',
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: lodash.get(result, "data")
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
  },
  {
    path: [
      '/auth/update-user', '/auth/update-user/:appType', //@Deprecated
      '/util/synchronize-user', '/util/synchronize-user/:appType'
    ],
    method: 'POST',
    input: {
      examples: [
        {
          path: '/util/synchronize-user/agent',
          body: {
            holderId: "5d2c53f6cbc31a7849913058",
            phoneNumber: "+84999999999",
            firstName: "Doe",
            lastName: "John",
            email: "john.doe@gmail.com",
            activated: true,
            deleted: false,
          },
        },
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          data: req.body
        }
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'updateUser',
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: lodash.get(result, "data")
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
  },
  {
    path: '/util/hash-password',
    method: 'POST',
    input: {
      transform: function(req) {
        if (lodash.isEmpty(req.body) || !lodash.isObject(req.body)) {
          return Bluebird.reject(new Error("Request's body is invalid"));
        }
        if (!('password' in req.body)) {
          return Bluebird.reject(new Error("Password field not found"));
        }
        return req.body.password;
      },
      examples: {
        "ok": "changeme",
      }
    },
    serviceName: 'app-handshake/bcryptor',
    methodName: 'hash',
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: {
            "digest": result
          }
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
  },
]

module.exports = mappings;

function extractAppType (req) {
  return req.params.appType || req.get('X-App-Type') || 'agent';
}

function transformError (err, req) {
  const output = {
    statusCode: err.statusCode || 500,
    headers: {},
    body: {
      name: err.name,
      message: err.message
    }
  };
  if (err.returnCode) {
    output.headers['X-Return-Code'] = err.returnCode;
  }
  if (lodash.isObject(err.payload)) {
    output.body.payload = err.payload;
  }
  return output;
}
