module.exports = {
  "config": {
    "validation": {
      "schema": {
        "type": "object",
        "properties": {
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
          "secretKey": {
            "type": "string"
          },
          "revisions": {
            "type": "object"
          },
          "errorCodes": {
            "type": "object",
            "patternProperties": {
              ".+": {
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
            }
          },
        },
        "additionalProperties": false
      }
    }
  }
};
