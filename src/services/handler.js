'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const glpn = require('google-libphonenumber');
const phoneUtil = glpn.PhoneNumberUtil.getInstance();

function Handler(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const schemaManager = params.schemaManager;
  const config = lodash.get(params, ['sandboxConfig'], {});
  const ctx = { L, T, config, schemaManager };

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
  return getModelMethod(schemaManager, 'UserModel', 'findOneAndUpdate').then(function(method) {
    const err = sanitizePhone(data);
    if (err) {
      return Promise.reject(err);
    }
    const userObject = {
      agentApp: {
        device: device,
        phoneNumber: data.phoneNumber,
        phone: data.phone,
        corpId: data.org
      }
    }
    return method(
      {
        "agentApp.phoneNumber": data.phoneNumber
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
  if (lodash.isEmpty(data.phoneNumber) && lodash.isEmpty(data.phone)) {
    return new Error('Phone info object must not be null');
  }
  // sync between data.phone and data.phoneNumber
  if (data.phone) {
    // build the derived phoneNumber
    let derivativeNumber = data.phone.countryCode + data.phone.number;
    if (data.phoneNumber) {
      if (data.phoneNumber !== derivativeNumber) {
        return new Error('Mismatched phone number');
      }
    } else {
      data.phoneNumber = derivativeNumber;
    }
  } else {
    data.phone = parsePhoneNumber(data.phoneNumber);
  }
  // validate phone & phoneNumber
  if (!isValidPhoneNumber(data.phoneNumber)) {
    return new Error(util.format('Invalid phone number [%s]', data.phoneNumber));
  }
  return null;
}

function parsePhoneNumber(phoneString) {
  const number = phoneUtil.parseAndKeepRawInput(phoneString, 'VN');
  return {
    country: phoneUtil.getRegionCodeForNumber(number),
    countryCode: '+' + number.getCountryCode(),
    number: number.getNationalNumber(),
    rawInput: number.getRawInput(),
  }
}

function isValidPhoneNumber(phoneString) {
  return phoneUtil.isValidNumber(phoneUtil.parse(phoneString, 'VN'));
}
