'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');
const jwt = require('jsonwebtoken');

function OauthApi(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const config = lodash.get(params, ['sandboxConfig'], {});

  config.expiredIn = config.expiredIn || 15 * 60; // expires in 15 minutes

  this.createAppAccessToken = function({ verification, user }) {
    const data = lodash.pick(verification, [
      "appType", "phoneNumber", "expiredIn", "expiredTime"
    ]);
    data.user = user._id;
    const token = jwt.sign(data, config.secretkey || 't0ps3cr3t', {
      expiresIn: data.expiredIn || config.expiredIn
    });
    return token;
  }
}

module.exports = OauthApi;
