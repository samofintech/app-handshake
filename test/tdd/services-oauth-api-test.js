'use strict';

const path = require('path');
const devebot = require('devebot');
const lodash = devebot.require('lodash');
const { tokenHandler } = require('tokenlib');
const { assert, mockit } = require('liberica');
const timekeeper = require('timekeeper');

describe('services:oauth-api', function() {
  describe('createAppAccessToken()', function() {
    const sandboxConfig = {
      otpExpiredIn: 60,
      secretKey: "dobietday",
    }

    const tc = {
      "current": "2020-07-17T11:22:33.123Z",
      "expiredTime": "2020-07-17T11:23:33.123Z",
      "expiredTime_plus_2": "2020-07-17T11:23:35.123Z",
      "data": {
        "user": {
          "_id": "638c1d0bfebc98437e09db0b",
          "customerApp": {
            "holderId": "638c1f97febc98437e09db10",
            "username": "guest",
            "email": "guest@gmail.com"
          }
        },
        "constraints": {
          "appType": "customerApp",
          "permissions": [
            "CUSTOMER_READ", "CUSTOMER_WRITE"
          ]
        }
      },
      "token": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        + '.eyJhcHBUeXBlIjoiY3VzdG9tZXJBcHAiLCJwZXJtaXNzaW9ucyI6WyJDVVNUT01FUl9SRUFEIiwiQ1VTVE9NRVJfV1JJVEUiXSwi'
        + 'dXNlcklkIjoiNjM4YzFkMGJmZWJjOTg0MzdlMDlkYjBiIiwiaG9sZGVySWQiOiI2MzhjMWY5N2ZlYmM5ODQzN2UwOWRiMTAiLCJpY'
        + 'XQiOjE1OTQ5ODQ5NTMsImV4cCI6MTU5NDk4NTAxM30'
        + '.Nslc4am24q8RaTpFxkqlfdzIppm8HiQV3Xio4qLJflo',
      "tokenPayload": {
        appType: 'customerApp',
        permissions: [ 'CUSTOMER_READ', 'CUSTOMER_WRITE' ],
        userId: '638c1d0bfebc98437e09db0b',
        holderId: '638c1f97febc98437e09db10',
        iat: 1594984953,
        exp: 1594985013
      }
    }

    const loggingFactory = mockit.createLoggingFactoryMock({ captureMethodCall: false });
    let serviceConstructor, service;

    beforeEach(function() {
      serviceConstructor = mockit.acquire('oauth-api', { libraryDir: '../src' });
      service = new serviceConstructor({ loggingFactory, sandboxConfig });
      timekeeper.freeze(new Date(tc.current));
    });

    afterEach(function() {
      timekeeper.reset();
    });

    it('Create an access token correctly', function() {
      const token = service.createAppAccessToken(tc.data);
      false && console.log(token);
      const tokenPayload = tokenHandler.verify(token, sandboxConfig.secretKey);
      false && console.log(tokenPayload);
      //
      assert.equal(token, tc.token);
      assert.deepEqual(tokenPayload, tc.tokenPayload);
    });
  });
});
