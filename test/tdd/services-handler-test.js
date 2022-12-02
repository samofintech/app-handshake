'use strict';

const devebot = require('devebot');
const lodash = devebot.require('lodash');
const path = require('path');
const assert = require('chai').assert;
const sinon = require('sinon');
const dtk = require('../index');

describe('services:handler', function() {
  describe('ServiceSelector', function() {
    let Handler, ServiceSelector;
    const serviceResolver = 'app-restfetch';
    const sandboxRegistry = { lookupService: sinon.stub() };

    beforeEach(function() {
      Handler = dtk.acquire('handler');
      ServiceSelector = dtk.get(Handler, 'ServiceSelector');
      sandboxRegistry.lookupService.resetBehavior();
    });

    it('Throw an exception if call the ServiceSelector as a function', function() {

    });
  });
});