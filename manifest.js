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
          }
        },
        "additionalProperties": false
      }
    }
  }
};
