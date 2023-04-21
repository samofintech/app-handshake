'use strict';

const Devebot = require('devebot');
const lodash = Devebot.require('lodash');
const LogConfig = Devebot.require('logolite').LogConfig;
const LogTracer = Devebot.require('logolite').LogTracer;
const path = require('path');
const rewire = require('rewire');
const sinon = require('sinon');

function TestUtils() {

  this.acquire = function (modulePath) {
    return rewire(path.join(__dirname, '../lib/services', modulePath));
  }

  this.get = function(rewiredModule, propName) {
    return rewiredModule.__get__(propName);
  }

  this.set = function(rewiredModule, propName, newValue) {
    rewiredModule.__set__(propName, newValue);
  }

  this.spy = function(rewiredModule, propName) {
    const origin = this.get(rewiredModule, propName);
    if (lodash.isFunction(origin)) {
      const spied = sinon.spy(origin);
      this.set(rewiredModule, propName, spied);
    }
    return this.get(rewiredModule, propName);
  }

  this.createLoggingFactoryMock = function(params) {
    return new LoggingFactoryMock(params);
  }
}

function LoggingFactoryMock(params) {
  params = params || {};
  this.branch = function(blockRef) { return this }
  this.getLogger = function() { return logger }
  this.getTracer = function() { return tracer }
  this.getTracerStore = function() { return tracerStore }
  this.resetHistory = function() {
    logger.has.resetHistory();
    logger.log.resetHistory();
    tracer.add.resetHistory();
    tracer.toMessage.resetHistory();
    tracerStore.add.splice(0);
    tracerStore.toMessage.splice(0);
  }
  const logger = {
    has: sinon.stub().returns(true),
    log: sinon.stub()
  }
  const tracerStore = { add: [], toMessage: [] }
  const tracer = {
    getLogID: LogTracer.ROOT.getLogID,
    add: sinon.stub().callsFake(function(params) {
      if (params.captureMethodCall !== false) {
        tracerStore.add.push(lodash.cloneDeep(params));
      }
      LogTracer.ROOT.add(params);
      return tracer;
    }),
    toMessage: sinon.stub().callsFake(function(params) {
      if (params.captureMethodCall !== false) {
        tracerStore.toMessage.push(lodash.cloneDeep(params));
      }
      return LogTracer.ROOT.toMessage(params);
    }),
    get: function(key) {
      if (key === 'instanceId' && 'instanceId' in params) {
        return params['instanceId'];
      }
      return LogTracer.ROOT.get(key);
    }
  }
}

module.exports = new TestUtils();
