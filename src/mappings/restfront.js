"use strict";

const Devebot = require("devebot");
const Bluebird = Devebot.require("bluebird");
const lodash = Devebot.require("lodash");

const apiMaps = [
  {
    path: [
      "/auth/login", "/auth/login/:appType"
    ],
    method: "POST",
    input: {
      transform: function(req, reqOpts) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          schemaVersion: reqOpts.schemaVersion || req.headers["x-schema-version"],
          data: req.body
        };
      },
      schema: {},
      validate: function(data) {
        return true;
      },
      examples: [
        {
          path: "/auth/login",
          body: {
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
        },
        {
          path: "/auth/login/admin",
          body: {
            "username": "adm",
            "password": "changeme",
          }
        },
      ]
    },
    serviceName: "app-handshake/handler",
    methodName: "register",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "public",
  },
  {
    path: "/auth/verification-code",
    method: "POST",
    input: {
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      },
      examples: [
        {
          path: "/auth/verification-code",
          body: {
            key: "UqR32OQ3S4arU3KalHbz9A",
            otp: "1543"
          }
        }
      ],
    },
    serviceName: "app-handshake/handler",
    methodName: "verificationCode",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "public",
  },
  {
    path: [
      "/auth/refresh-token", "/auth/refresh-token/:appType"
    ],
    method: "POST",
    input: {
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      },
    },
    serviceName: "app-handshake/handler",
    methodName: "refreshToken",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "public",
  },
  {
    path: [
      "/auth/revoke-token", "/auth/revoke-token/:appType"
    ],
    method: "POST",
    input: {
      examples: [
        {
          path: "/auth/revoke-token",
          body: {
            phoneNumber: "+84999999999"
          }
        }
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      }
    },
    serviceName: "app-handshake/handler",
    methodName: "revokeToken",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: [
      "/util/get-user", "/util/get-user/:appType"
    ],
    method: "POST",
    input: {
      examples: [
        {
          path: "/util/get-user/agent",
          body: {
            email: "john.doe@gmail.com",
            holderId: "5d2c53f6cbc31a7849913058",
            phoneNumber: "+84999999999",
          },
        },
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      }
    },
    serviceName: "app-handshake/handler",
    methodName: "getUser",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: [
      "/auth/update-user", "/auth/update-user/:appType", //@Deprecated
      "/util/synchronize-user", "/util/synchronize-user/:appType"
    ],
    method: "POST",
    input: {
      examples: [
        {
          path: "/util/synchronize-user/agent",
          body: {
            holderId: "5d2c53f6cbc31a7849913058",
            phoneNumber: "+84999999999",
            firstName: "Doe",
            lastName: "John",
            email: "john.doe@gmail.com",
            activated: true,
            deleted: false,
          },
        },
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      }
    },
    serviceName: "app-handshake/handler",
    methodName: "updateUser",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: [
      "/util/get-verification", "/util/get-verification/:appType"
    ],
    method: "POST",
    input: {
      examples: [
        {
          path: "/util/get-verification/agent",
          body: {
            holderId: "5d2c53f6cbc31a7849913058",
            phoneNumber: "+84999999999",
          },
        },
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      }
    },
    serviceName: "app-handshake/handler",
    methodName: "getVerification",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: [
      "/util/reset-verification", "/util/reset-verification/:appType"
    ],
    method: "POST",
    input: {
      examples: [
        {
          path: "/util/reset-verification",
          headers: {
            "X-App-Type": "agentApp",
          },
          body: {
            phoneNumber: "+84999999999",
          },
        },
        {
          path: "/util/reset-verification/agent",
          body: {
            phoneNumber: "+84999999999",
          },
        },
      ],
      transform: function(req) {
        return {
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req),
          language: extractLangCode(req),
          data: req.body
        };
      }
    },
    serviceName: "app-handshake/handler",
    methodName: "resetVerification",
    output: {
      transform: transformOutput,
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: "/util/hash-password",
    method: "POST",
    input: {
      transform: function(req) {
        if (lodash.isEmpty(req.body) || !lodash.isObject(req.body)) {
          return Bluebird.reject(new Error("Request's body is invalid"));
        }
        if (!("password" in req.body)) {
          return Bluebird.reject(new Error("Password field not found"));
        }
        return req.body.password;
      },
      examples: {
        "ok": "changeme",
      }
    },
    serviceName: "app-handshake/bcryptor",
    methodName: "hash",
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: {
            "digest": result
          }
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: ["/auth/permission-groups/create", "/auth/permission-groups/create/:appType"],
    method: "POST",
    input: {
      examples: [
        {
          path: "/permission-groups/create",
          headers: {
            "X-App-Type": "adminApp",
          },
          body: {
            name: "ADMIN_GROUP",
            permissions: [""]
          },
        },
        {
          path: "/permission-groups/create/admin",
          body: {
            name: "ADMIN_GROUP",
            permissions: [""]
          },
        },
      ],
      transform: function(req) {
        if (lodash.isEmpty(req.body) || !lodash.isObject(req.body)) {
          return Bluebird.reject(new Error("Request's body is invalid"));
        }
        return {
          name: req.body.name,
          permissions: req.body.permissions,
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req)
        };
      }
    },
    serviceName: "app-handshake/permissionGroup",
    methodName: "createPermissionGroup",
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: result
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  },
  {
    path: [
      "/auth/permission-groups/getPermission", "/auth/permission-groups/getPermission/:appType"
    ],
    method: "POST",
    input: {
      examples: [
        {
          path: "/auth/permission-groups/getPermission",
          headers: {
            "X-App-Type": "adminApp",
          },
          body: {
            groups: [""]
          },
        },
        {
          path: "/auth/permission-groups/getPermission/admin",
          body: {
            groups: [""]
          },
        },
      ],
      transform: function(req) {
        if (lodash.isEmpty(req.body) || !lodash.isObject(req.body)) {
          return Bluebird.reject(new Error("Request's body is invalid"));
        }
        return {
          groups: req.body.groups,
          appType: extractAppType(req),
          appPlatformType: extractAppPlatformType(req)
        };
      }
    },
    serviceName: "app-handshake/permissionGroup",
    methodName: "getPermissionByGroupNameAndAppType",
    output: {
      transform: function(result = {}, req) {
        const payload = {
          headers: {
            "X-Return-Code": result.code || 0
          },
          body: result
        };
        return payload;
      }
    },
    error: {
      transform: transformError,
    },
    scope: "private",
  }
];

function extractAppType (req) {
  return req.params.appType || req.get("X-App-Type") || req.get("x-app-type") || "agent";
}

function extractAppPlatformType (req) {
  return req.params.appPlatformType || req.get("X-Platform-App") || req.get("X-Mobile-App") || req.get("x-mobile-app") || "unknown";
}

function extractLangCode (req) {
  return req.get("X-Lang-Code") || req.get("X-Language");
}

function transformOutput (result = {}, req) {
  const payload = {
    headers: {
      "X-Return-Code": result.code || 0
    },
    body: lodash.get(result, "data")
  };
  return payload;
}

function transformError (err, req) {
  const output = {
    statusCode: err.statusCode || 500,
    headers: {},
    body: {
      name: err.name,
      message: err.message
    }
  };
  if (err.packageRef) {
    output.headers["X-Package-Ref"] = err.packageRef;
  }
  if (err.returnCode) {
    output.headers["X-Return-Code"] = err.returnCode;
  }
  if (lodash.isObject(err.payload)) {
    output.body.payload = err.payload;
  }
  return output;
}

module.exports = { apiMaps };
