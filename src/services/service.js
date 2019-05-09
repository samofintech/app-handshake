'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');
const path = require('path');

function Service(params) {
  params = params || {};
  let self = this;

  let L = params.loggingFactory.getLogger();
  let T = params.loggingFactory.getTracer();

  let pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  let contextPath = pluginCfg.contextPath || '/handshake';
  let authenticationPath = contextPath + '/auth/login';
  let handshakeHandler = params['handler'];
  let webweaverService = params['app-webweaver/webweaverService'];
  let express = webweaverService.express;

  self.getAuthenticatorLayer = function(branches) {
    return {
      name: 'app-handshake-authentication',
      path: authenticationPath,
      middleware: handshakeHandler.authenticate,
      branches: branches
    };
  }

  if (pluginCfg.autowired !== false) {
    webweaverService.push([
      webweaverService.getSessionLayer([
        webweaverService.getJsonBodyParserLayer(),
        self.getAuthenticatorLayer()
      ], authenticationPath)
    ], pluginCfg.priority);
  }
};

Service.referenceList = [
  'handler',
  'app-webweaver/webweaverService'
];

module.exports = Service;
