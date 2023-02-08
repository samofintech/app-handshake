/* eslint-disable node/no-extraneous-require */
"use strict";
const uuid = require("uuid");
const { moment } = require("tokenlib");
const fetch = require("node-fetch");

const EVENT_MAPPING = {
  gkp: {
    login: {
      firstOTPSuccess: "EVT__GKP__LOGIN__FIRST_VERIFICATION_OTP__SUCCESS",
    }
  }
};

function Eventor(params = {}) {
  const { dataManipulator } = params;
  this.loginFirstOTPSuccess = function(params) {
    try {
      const { appType, appPlatformType = "default", userId, phoneNumber, accessToken } = params;
      dataManipulator.count({
        type: "VerificationModel",
        filter: {
          appType,
          appPlatformType,
          user: userId,
          verified: true
        }
      }).then(verificationNumbers => {
        if (verificationNumbers === 1) {
          const username = "apiuser";
          const password = "qwerty";
          fetch(process.env.EVENT_SERVER_URL, {
            method: "POST",
            body: JSON.stringify({
              "events": [
                {
                  "data": {
                    "appType": appType,
                    "appPlatformType": appPlatformType,
                    "userId": userId,
                    "phoneNumber": phoneNumber
                  },
                  "event": EVENT_MAPPING.gkp.login.firstOTPSuccess,
                  "datetime": moment().toISOString(),
                }
              ]
            }),
            headers: {
              "X-Access-Token": accessToken,
              "Authorization": "Basic " + Buffer.from(username + ":" + password).toString("base64"),
              "X-App-Type": appType,
              "Content-Type": "application/json",
              "X-Domain-Type": "User-Engagement",
              "X-Tier-Type": process.env.X_TIER_TYPE,
              "X-Request-Id": uuid.v4(),
            }
          });
        }
      });
    } catch (err) {
      return;
    }
  };
}

Eventor.referenceHash = {
  errorManager: "app-errorlist/manager",
  dataManipulator: "app-datastore/dataManipulator"
};

module.exports = Eventor;
