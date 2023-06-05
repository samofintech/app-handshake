"use strict";

/**
 *
 * Device Model
 */
module.exports = {
  name: "FixedotpModel",
  descriptor: {
    phoneNumber: {
      type: String
    },
    otp: {
      type: String
    },
    enabled: {
      type: Boolean,
      default: true
    },
    tags: [String]
  },
  options: {
    collection: "fixed-otps"
  }
};