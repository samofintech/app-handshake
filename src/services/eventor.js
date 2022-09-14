"use strict";
const uuid = require("uuid");
const moment = require("moment");
const fetch = require("node-fetch");

const EVENT_MAPPING = {
  gkp: {
    login: {
      firstOTPSuccess: "EVT_GKP_LOGIN_FIRST_OTP_SUCCESS",
    }
  }
};

function Eventor(params = {}) {
  const { dataManipulator } = params;
  this.loginFirstOTPSuccess = function(params) {
    try {
      const { appType, appPlatformType = "default", phoneNumber, accessToken } = params;
      dataManipulator.count({
        type: "VerificationModel",
        filter: {
          appType,
          appPlatformType,
          verified: true
        }
      }).then(verificationNumbers => {
        if (verificationNumbers == 1) {
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
              "X-Request-Id": uuid.v4(),
            }
          });
        }
      });
    } catch (err) { }
  };
}

Eventor.referenceHash = {
  errorManager: "app-errorlist/manager",
  dataManipulator: "app-datastore/dataManipulator"
};

module.exports = Eventor;
