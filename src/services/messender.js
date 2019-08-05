'use strict';

const Devebot = require('devebot');
const Bluebird = Devebot.require('bluebird');

function Messender (params = {}) {
  this.sendSMS = function() {
    return Bluebird.resolve();
  };
  this.sendEmail = function() {
    return Bluebird.resolve();
  };
}

module.exports = Messender;
