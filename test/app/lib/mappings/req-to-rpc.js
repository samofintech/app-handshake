'use strict';

var lodash = Devebot.require('lodash');

var mappings = [
  {
    path: '/auth/login',
    method: 'POST',
    transformRequest: function(req) {
      return {
        data: req.body
      }
    },
    serviceName: 'app-handshake/handler',
    methodName: 'authenticate',
    transformError: function(err, req) {
      return err;
    },
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
    path: '/auth/verification-code',
    method: 'POST',
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
    }
  }
]

module.exports = mappings;
