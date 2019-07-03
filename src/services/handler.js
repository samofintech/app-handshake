'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function Handler(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const pluginCfg = lodash.get(params, ['sandboxConfig'], {});

  this.authenticate = function (data) {
    return Promise.resolve(data);
  }

  this.verificationCode = function (data) {
    return Promise.resolve(data);
  }

  this.refreshToken = function (data) {
    return Promise.resolve(data);
  }
};

module.exports = Handler;
