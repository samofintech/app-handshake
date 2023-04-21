module.exports = {
  "config": {
    "validation": {
      "schema": {
        "type": "object",
        "properties": {
          "maxResendTimes": {
            "type": "number"
          },
          "invalidPasswordAttempts": {
            "type": "number"
          },
          "otpExpiredIn": {
            "type": "number"
          },
          "otpTypingTime": {
            "type": "number"
          },
          "otpSize": {
            "type": "number"
          },
          "saltRounds": {
            "type": "number"
          },
          "smsTemplate": {
            "type": "string"
          },
          "tokenExpiredIn": {
            "type": "number"
          },
          "defaultCountryCode": {
            "type": "string"
          },
          "selectedFields": {
            "type": "object"
          },
          "serviceResolver": {
            "type": "string"
          },
          "rejectUnknownUser": {
            "type": "boolean"
          },
          "createIfUserNotFound": {
          },
          "secretKey": {
            "type": "string"
          },
          "revisions": {
            "type": "object"
          },
          "pwdRules": {
            "type": "object"
          },
          "presetOTPs": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "phoneNumber": {
                  "type": "string"
                },
                "otp": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          },
          "errorCodes": {
            "type": "object",
            "patternProperties": {
              "^[a-zA-Z]\\w*$": {
                "type": "object",
                "properties": {
                  "message": {
                    "type": "string"
                  },
                  "returnCode": {
                    "oneOf": [
                      {
                        "type": "number"
                      },
                      {
                        "type": "string"
                      }
                    ]
                  },
                  "statusCode": {
                    "type": "number"
                  },
                  "description": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            },
            "additionalProperties": false
          },
        },
        "additionalProperties": false
      }
    }
  }
};
