'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const chores = Devebot.require('chores');
const logolite = Devebot.require('logolite');
const genKey = logolite.LogConfig.getLogID;
const moment = require('moment');
const util = require('util');
const glpn = require('google-libphonenumber');
const phoneUtil = glpn.PhoneNumberUtil.getInstance();
const otp = require('../utils/otp-generator');
const otpDefaultOpts = { alphabets: false, upperCase: false, specialChars: false };

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
  return model[methodName];
}

function getModelMethodPromise (schemaManager, modelName, methodName) {
  const model = schemaManager.getModel(modelName);
  if (!model) {
    return Promise.reject(new Error(modelName + '_not_available'));
  }
  return Promise.resolve(Promise.promisify(model[methodName], { context: model }));
}

function upsertDevice (packet = {}) {
  const { schemaManager, data } = packet;
  return getModelMethodPromise(schemaManager, 'DeviceModel', 'findOneAndUpdate').then(function(method) {
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
  let appType = 'agentApp';
  return Promise.resolve().then(function() {
    return (appType = mappingAppType(data.appType));
  })
  .then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOneAndUpdate');
  })
  .then(function(method) {
    const err = sanitizePhone(data);
    if (err) {
      return Promise.reject(err);
    }

    const conditions = {};
    conditions[[appType, "phoneNumber"].join(".")] = data.phoneNumber;

    const userObject = {};
    userObject[appType] = {
      device: device,
      phoneNumber: data.phoneNumber,
      phone: data.phone,
      corpId: data.org
    }

    return method(conditions, userObject, { new: true, upsert: true });
  })
  .then(function(user) {
    return lodash.assign(packet, { user });
  });
}

function generateOTP (packet = {}) {
  const { schemaManager, data, user, device } = packet;
  let appType = 'agentApp';
  return Promise.resolve().then(function() {
    return (appType = mappingAppType(data.appType));
  })
  .then(function() {
    return getModelMethodPromise(schemaManager, 'VerificationModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {
      phoneNumber: user[appType].phoneNumber
    };
    const opts = {
      sort: { expiredTime: -1 }
    }
    return method(conditions, null, opts);
  })
  .then(function(verification) {
    const now = moment();
    const nowPlus = now.add(5, 'minutes');
    if (verification) {
      if (verification.expiredTime) {
        const oldExpiredTime = new moment(verification.expiredTime);
        if (nowPlus.isAfter(oldExpiredTime)) {
          verification = null;
        }
      } else {
        verification = null;
      }
    }
    if (verification) {
      return verification;
    } else {
      const verificationCreate = getModelMethodPromise(schemaManager, 'VerificationModel', 'create');
      return verificationCreate.then(function(method) {
        const obj = {
          key: genKey(),
          otp: otp.generate(4, otpDefaultOpts),
          expiredIn: 15 * 60,
          expiredTime: now.add(15, 'minutes').toDate(),
          phoneNumber: user[appType].phoneNumber,
          user: user._id,
          device: device._id
        };
        const opts = {};
        return method([obj], opts).spread(function(otp) {
          return otp;
        });
      });
    }
  })
  .then(function(verification) {
    return lodash.assign(packet, { verification });
  })
}

function summarize (packet = {}) {
  return {
    data: lodash.pick(packet.verification, ["key", "expiredIn", "expiredTime"])
  }
}

function mappingAppType(appType) {
  if (['sales', 'agent', 'agent-app', 'agentApp'].indexOf(appType) >= 0) {
    return 'agentApp';
  }
  return Promise.reject(new Error(util.format('Unsupported appType [%s]', appType)));
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
