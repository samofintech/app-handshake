'use strict';

var devebot = require('devebot');
var lodash = devebot.require('lodash');
var path = require('path');
var assert = require('chai').assert;
var sinon = require('sinon');
var dtk = require('../index');

describe('services:handler', function() {
  describe('ServiceSelector', function() {
    var Handler, ServiceSelector;
    var serviceResolver = 'app-restfetch';
    var sandboxRegistry = { lookupService: sinon.stub() };

    beforeEach(function() {
      Handler = dtk.acquire('handler');
      ServiceSelector = dtk.get(Handler, 'ServiceSelector');
      sandboxRegistry.lookupService.resetBehavior();
    });

    it('Throw an exception if call the ServiceSelector as a function', function() {

    });
  });
});