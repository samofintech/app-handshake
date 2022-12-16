'use strict';

var devebot = require('devebot');
var lodash = devebot.require('lodash');
var path = require('path');
var assert = require('chai').assert;
var sinon = require('sinon');
var dtk = require('../index');

const moduleHome = path.join(__dirname, "../../lib/services");

describe('services:handler', function() {
  describe('ServiceSelector', function() {
    var Handler, ServiceSelector;
    var sandboxRegistry = { lookupService: sinon.stub() };

    beforeEach(function() {
      Handler = dtk.acquire('handler', { moduleHome });
      sandboxRegistry.lookupService.resetBehavior();
    });

    it('Throw an exception if call the ServiceSelector as a function', function() {

    });
  });
});