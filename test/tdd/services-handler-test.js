'use strict';

const devebot = require('devebot');
const lodash = devebot.require('lodash');
const path = require('path');
const liberica = require("liberica");
const assert = liberica.assert;
const mockit = liberica.mockit;
const sinon = liberica.sinon;

const moduleHome = path.join(__dirname, "../../lib/services/");

describe('services:handler', function() {
  describe('parsePhoneNumber', function() {
    let Handler, parsePhoneNumber;
    const serviceResolver = 'app-handshake';
    const sandboxRegistry = { lookupService: sinon.stub() };

    beforeEach(function() {
      Handler = mockit.acquire('handler', { moduleHome });
      parsePhoneNumber = mockit.get(Handler, 'parsePhoneNumber');
      sandboxRegistry.lookupService.resetBehavior();
    });

    it('Throw an exception if call the ServiceSelector as a function', function() {

    });
  });
});