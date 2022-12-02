"use strict";

const path = require("path");

module.exports = {
  plugins: {
    appHandshake: {
      errorCodes: {
        // Methods
        MethodUnsupportedForAppType: {
          message:
            "The method[${method}] is unsupported for the appType[${appType}]",
          returnCode: 1100,
          statusCode: 400
        },
        // User
        UserNotFound: {
          message: "user not found",
          returnCode: 1101,
          statusCode: 400
        },
        UserIsLocked: {
          message: "user is locked",
          returnCode: 1102,
          statusCode: 400
        },
        UserIsDeleted: {
          message: "user is deleted",
          returnCode: 1103,
          statusCode: 400
        },
        UserIsNotVerified: {
          message: "user has not be verified",
          returnCode: 1104,
          statusCode: 400
        },
        PasswordNotFound: {
          message: "Password not found",
          returnCode: 1111,
          statusCode: 400
        },
        PasswordIsMismatched: {
          message: "Password is mismatched",
          returnCode: 1112,
          statusCode: 400
        },
        TokenSecretNotFound: {
          message: "TokenSecret not found",
          returnCode: 1113,
          statusCode: 400
        },
        TokenSecretIsMismatched: {
          message: "TokenSecret is mismatched",
          returnCode: 1114,
          statusCode: 400
        },
        UsernameHasOccupied: {
          message: "The username has already occupied",
          returnCode: 1121,
          statusCode: 400
        },
        PhoneNumberHasOccupied: {
          message: "The phoneNumber has already occupied",
          returnCode: 1122,
          statusCode: 400
        },
        AdminAppHolderIdOrUsernameExpected: {
          message: "[adminApp]: holderId/username expected",
          returnCode: 1123,
          statusCode: 400
        },
        AgentAppHolderIdOrPhoneNumberExpected: {
          message: "[agentApp]: holderId/phoneNumber expected",
          returnCode: 1124,
          statusCode: 400
        },
        ClientAppHolderIdOrTokenKeyExpected: {
          message: "[clientApp]: holderId/tokenKey expected",
          returnCode: 1125,
          statusCode: 400
        },
        TokenKeyHasOccupied: {
          message: "The token key has already occupied",
          returnCode: 1126,
          statusCode: 400
        },
        InsuranceCustomerAppHolderIdOrPhoneNumberExpected: {
          message: "[InsuranceCustomerApp]: holderId/phoneNumber expected",
          returnCode: 1127,
          statusCode: 400
        },
        // phoneNumber
        PhoneNumberMustBeNotNull: {
          message: "One of phoneNumber and phone object must be not null",
          returnCode: 1131,
          statusCode: 400
        },
        PhoneNumberIsInvalid: {
          message: "phoneNumber is invalid",
          returnCode: 1132,
          statusCode: 400
        },
        PhoneNumberMismatched: {
          message: "phoneNumber is mismatched",
          returnCode: 1133,
          statusCode: 400
        },
        // Verification
        VerificationKeyNotFound: {
          message: "Verification key not found",
          returnCode: 1141,
          statusCode: 400
        },
        VerificationExpiredTimeIsEmpty: {
          message: "Invalid expired time",
          returnCode: 1142,
          statusCode: 400
        },
        VerificationCouldNotBeCreated: {
          message: "Could not create a new verification object",
          returnCode: 1146,
          statusCode: 400
        },
        VerificationCouldNotBeUpdated: {
          message: "Could not update the verification object",
          returnCode: 1143,
          statusCode: 400
        },
        VerificationUserNotFound: {
          message: "Verification user not found",
          returnCode: 1144,
          statusCode: 400
        },
        VerificationUserAppTypeNotFound: {
          message: "Verification user does not use this appType",
          returnCode: 1145,
          statusCode: 400
        },
        // OTP
        OTPHasExpired: {
          message: "OTP has expired",
          returnCode: 1151,
          statusCode: 400
        },
        OTPIncorrectCode: {
          message: "Incorrect OTP code",
          returnCode: 1152,
          statusCode: 400
        },
        // refreshToken
        RefreshTokenNotFound: {
          message: "refreshToken not found",
          returnCode: 1161,
          statusCode: 400
        }
      },
      presetOTPs: []
    },
    appRestfront: {
      mappingStore: {
        "handshake-restfront": path.join(__dirname, "../lib/mappings/restfront")
      }
    },
    appDatastore: {
      mappingStore: {
        "handshake-datastore": path.join(__dirname, "../lib/mappings/datastore")
      }
    }
  },
  bridges: {
    mongoose: {
      appDatastore: {
        manipulator: {
          connection_options: {
            host: "127.0.0.1",
            port: "27017",
            name: "handshake"
          }
        }
      }
    }
  }
};
