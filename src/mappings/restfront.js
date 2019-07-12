'use strict';

var lodash = Devebot.require('lodash');

var mappings = [
  {
    path: '/auth/login',
    method: 'POST',
    input: {
      transform: function(req) {
        return {
          data: req.body
        }
      },
      schema: {},
      validate: function(data) {
        return true;
      },
      examples: {
        ok: {
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
      }
    },
    transformRequest: function(req) {
      return {
        data: req.body
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'login',
    transformError: function(err, req) {
      let code = 500;
      let text = err.message;
      return {
        code: code,
        text: text
      };
    },
    transformResponse: function(result, req) {
      const payload = {
        headers: {
          "X-Return-Code": result.code || 0
        },
        body: lodash.get(result, "data")
      };
      return payload;
    }
  },
  {
    path: '/auth/logout',
    method: 'POST',
    input: {
      example: {
        refreshToken: "UqR32OQ3S4arU3KalHbz9A"
      },
      transform: function(req) {
        return {
          data: req.body
        }
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'logout',
    output: {
      transform: function(result, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: lodash.get(result, "data")
        };
        return payload;
      }
    }
  },
  {
    path: '/auth/verification-code',
    method: 'POST',
    input: {
      example: {
        key: "UqR32OQ3S4arU3KalHbz9A",
        otp: "1543"
      }
    },
    transformRequest: function(req) {
      return {
        data: req.body
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'verificationCode',
    transformResponse: function(result, req) {
      const payload = {
        headers: {
          "X-Return-Code": result.code
        },
        body: lodash.get(result, "data")
      };
      return payload;
    }
  },
  {
    path: '/auth/refresh-token',
    method: 'POST',
    transformRequest: function(req) {
      return {
        data: req.body
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'refreshToken',
    transformResponse: function(result, req) {
      const payload = {
        headers: {
          "X-Return-Code": result.code
        },
        body: lodash.get(result, "data")
      };
      return payload;
    },
    transformError: function(err, req) {
      return {
        code: 500,
        text: err.message
      };
    },
  }
]

module.exports = mappings;
