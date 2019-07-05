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
      .then(generateOTP)
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

function getModelMethod (schemaManager, modelName, methodName) {
  const model = schemaManager.getModel(modelName);
  if (!model) {
    return Promise.reject(new Error(modelName + '_not_available'));
  }
  return Promise.resolve(Promise.promisify(model[methodName], { context: model }));
}

function upsertDevice (packet = {}) {
  const { schemaManager, data } = packet;
  return getModelMethod(schemaManager, 'DeviceModel', 'findOneAndUpdate').then(function(method) {
    return method(
      {
        'imei': data.device.imei,
        'platform': data.device.platform
      },
      data,
      {
        new: true,
        upsert: true
      }
    )
  }).then(function(device) {
    return lodash.assign(packet, { device });
  });
}

function upsertUser (packet = {}) {
  const { schemaManager, data, device } = packet;
  return getModelMethod(schemaManager, 'DeviceModel', 'findOneAndUpdate').then(function(method) {
    const err = sanitizePhone(data);
    if (err) {
      return Promise.reject(err);
    }
    const userObject = {
      agentApp: {
        device: device,
        phone: data.phone,
        corpId: data.org
      }
    }
    return method(
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

function generateOTP (packet = {}) {
  const { schemaManager, data, device } = packet;
  return packet;
}

function summarize (packet = {}) {
  return { data: packet.user }
}

function sanitizePhone (data = {}) {
  if (lodash.isEmpty(data.phone)) {
    return new Error('Phone info object must not be null');
  }
  if (lodash.isEmpty(data.phone.number)) {
    return new Error('Phone number must not be null');
  }
  return null;
}
