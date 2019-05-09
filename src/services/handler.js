'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function Handler(params) {
  params = params || {};

  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  const tracelogService = params['app-tracelog/tracelogService'];

  const getRequestId = function(req) {
    return tracelogService.getRequestId(req);
  }

  this.authenticate = function (req, res, next) {
    const self = this;
    Promise.resolve()
    .then(function() {
      res.status(200).json({
        code: 2,
        data: {
          verficationId: "8724"
        }
      })
    })
    .catch(function (error) {
      L.has('debug') && L.log('debug', 'Authentication failed. error: %s - Request[%s]', error, getRequestId(req));
      res.status(400).json({
        error: true
      });
    })
    .finally(function () {
      L.has('debug') && L.log('debug', 'Authentication finish - Request[%s]', getRequestId(req));
    });
  }
};

Handler.referenceList = [
  "devebot/sandboxRegistry",
  "app-tracelog/tracelogService"
];

module.exports = Handler;
