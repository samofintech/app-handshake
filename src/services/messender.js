'use strict';

const Devebot = require('devebot');

function Messender(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();

  this.sendSMS = function() {}

  this.sendEmail = function() {}
}

module.exports = Messender;
