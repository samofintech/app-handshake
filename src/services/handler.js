'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function Handler(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const schemaManager = params.schemaManager;
  const ctx = { L, T, schemaManager };
  const pluginCfg = lodash.get(params, ['sandboxConfig'], {});

  function attachServices (packet) {
    return lodash.assign(packet, ctx);
  }

  function detachServices (packet) {
    return lodash.omit(packet, lodash.keys(ctx));
  }

  this.authenticate = function (packet) {
    return Promise.resolve(packet)
      .then(attachServices)
      .then(upsertDevice)
      .then(upsertUser)
      .then(detachServices)
      .then(summarize);
  }

  this.verificationCode = function (packet) {
    return Promise.resolve(packet);
  }

  this.refreshToken = function (packet) {
    return Promise.resolve(packet);
  }
};

Handler.referenceHash = {
  schemaManager: 'app-datastore/schemaManager'
};

module.exports = Handler;

function upsertDevice (packet = {}) {
  const { schemaManager, data } = packet;
  const deviceModel = schemaManager.getModel('DeviceModel');
  if (!deviceModel) return Promise.reject(new Error('DeviceModel_not_available'));
  const findOneAndUpdate = Promise.promisify(deviceModel.findOneAndUpdate, { context: deviceModel });
  let p = findOneAndUpdate(
    {
      'imei': data.device.imei,
      'platform': data.device.platform
    },
    data,
    {
      new: true,
      upsert: true
    }
  );
  p = p.then(function(device) {
    return lodash.assign(packet, { device });
  });
  return p;
}

function upsertUser (packet = {}) {
  const { schemaManager, data, device } = packet;
  const model = schemaManager.getModel('UserModel');
  if (!model) {
    return Promise.reject(new Error('UserModel_not_available'));
  }
  const err = sanitizePhone(data);
  if (err) {
    return Promise.reject(err);
  }
  const findOneAndUpdate = Promise.promisify(model.findOneAndUpdate, { context: model });
  return Promise.resolve().then(function() {
    const err = sanitizePhone(data);
    if (err) {
      return Promise.reject(err);
    }
    const userObject = {
      agentApp: lodash.assign(data.phone, {
        device: device,
        corpId: data.org
      })
    }
    return findOneAndUpdate(
      {
        "agentApp.device": device._id
      },
      userObject,
      {
        new: true,
        upsert: true
      }
    )
  })
  .then(function(user) {
    return lodash.assign(packet, { user });
  });
}

function summarize (packet = {}) {
  return { data: packet.user }
}

function sanitizePhone (data = {}) {
  if (lodash.isEmpty(data.phone)) {
    return new Error('Phone info object must not be null');
  }
  return null;
}
