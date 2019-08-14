'use strict';

const Devebot = require('devebot');
const Bluebird = Devebot.require('bluebird');

function Messender (params = {}) {
  this.sendSMS = function() {
    return Bluebird.resolve({
      message: 'This is the non-effect action'
    });
  };
  this.sendEmail = function() {
    return Bluebird.resolve({
      message: 'This is the non-effect action'
    });
  };
}

module.exports = Messender;
