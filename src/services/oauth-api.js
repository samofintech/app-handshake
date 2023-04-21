"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");
const { jsonwebtoken: jwt } = require("tokenlib");
const { tokenHandler } = require("tokenlib");

function OauthApi (params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const config = lodash.get(params, ["sandboxConfig"], {});

  config.otpExpiredIn = config.otpExpiredIn || 15 * 60; // expires in 15 minutes

  this.createAppAccessToken = function({ user, constraints }) {
    const data = lodash.clone(constraints);
    data.userId = user._id;
    data.holderId = lodash.get(user, [data.appType, "holderId"]);
    //
    let token = tokenHandler.encode(data, config.secretKey || "t0ps3cr3t", {
      expiresIn: data.expiredIn || config.otpExpiredIn
    });
    //
    if (params.oldVersionSupported) {
      token = jwt.sign(data, config.secretKey || "t0ps3cr3t", {
        expiresIn: data.expiredIn || config.otpExpiredIn
      });
    }
    //
    L.has("debug") && L.log("debug", T.add({ token }).toMessage({
      text: "A new access-token has been created"
    }));
    //
    return token;
  };
}

module.exports = OauthApi;
