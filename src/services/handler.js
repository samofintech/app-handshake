'use strict';

const assert = require('assert');
const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const chores = Devebot.require('chores');
const lodash = Devebot.require('lodash');
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
  const packageName = params.packageName || 'app-handshake';
  const blockRef = chores.getBlockRef(__filename, packageName);

  const { oauthApi, sandboxRegistry, schemaManager } = params;

  const config = lodash.get(params, ['sandboxConfig'], {});
  config.expiredIn = config.expiredIn || 15 * 60;
  config.expiredMargin = config.expiredMargin || 2 * 60;
  config.otpSize = config.otpSize || 7;
  config.defaultCountryCode = config.defaultCountryCode || 'VN';
  config.selectedFields = config.selectedFields || {
    key: 1, expiredIn: 1, expiredTime: 1, phoneNumber: 0,
  }
  config.projection = [];
  lodash.forOwn(config.selectedFields, function(flag, fieldName) {
    if (flag) {
      config.projection.push(fieldName);
    }
  })

  const serviceResolver = config.serviceResolver || 'app-restfetch/resolver';
  const serviceSelector = new ServiceSelector({ serviceResolver, sandboxRegistry });
  // const serviceSelector = chores.newServiceSelector({ serviceResolver, sandboxRegistry });

  const ctx = { L, T, packageName, config, schemaManager, serviceSelector, oauthApi };

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
      .then(sendOTP)
      .then(summarize)
      .then(detachServices);
  }

  this.verificationCode = function (packet) {
    return Promise.resolve(packet)
      .then(attachServices)
      .then(verifyOTP)
      .then(detachServices);
  }

  this.refreshToken = function (packet) {
    return Promise.resolve(packet);
  }
};

Handler.referenceHash = {
  oauthApi: 'oauthApi',
  sandboxRegistry: 'devebot/sandboxRegistry',
  schemaManager: 'app-datastore/schemaManager'
};

module.exports = Handler;

function getModelMethodGeneral (schemaManager, modelName, methodName) {
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
  return getModelMethodPromise(schemaManager, 'DeviceModel', 'findOneAndUpdate')
  .then(function(method) {
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
  })
  .then(function(device) {
    return lodash.assign(packet, { device });
  });
}

function upsertUser (packet = {}) {
  const { schemaManager, config, data, device } = packet;
  let appType = 'unknown';
  return Promise.resolve().then(function() {
    return (appType = mappingAppType(data.appType));
  })
  .then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOneAndUpdate');
  })
  .then(function(method) {
    const err = sanitizePhone(data, config);
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
  const { schemaManager, config, data, user, device } = packet;
  let appType = 'unknown';
  return Promise.resolve().then(function() {
    return (appType = mappingAppType(data.appType));
  })
  .then(function() {
    return getModelMethodPromise(schemaManager, 'VerificationModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {
      appType: appType,
      phoneNumber: user[appType].phoneNumber
    };
    const opts = {
      sort: { expiredTime: -1 }
    }
    return method(conditions, null, opts);
  })
  .then(function(verification) {
    const now = moment();
    const nowPlus = now.add(config.expiredMargin, 'seconds');
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
          otp: otp.generate(config.otpSize, otpDefaultOpts),
          expiredIn: config.expiredIn,
          expiredTime: now.add(config.expiredIn, 'seconds').toDate(),
          user: user._id,
          device: device._id,
          appType: appType,
          phoneNumber: user[appType].phoneNumber
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

function sendOTP (packet = {}) {
  const { packageName, config, serviceSelector, verification } = packet;
  const messenderService = [packageName, 'messender'].join(chores.getSeparator());
  const ref = serviceSelector.lookupMethod(messenderService, 'sendSMS');
  if (ref.service && ref.method) {
    ref.method({
      text: util.format("Please use the code - %s to verify your phone", verification.otp),
      phoneNumber: verification.phoneNumber,
    });
  }
  return Promise.resolve(packet);
}

function summarize (packet = {}) {
  const { config, verification } = packet;
  return {
    data: lodash.pick(verification, config.projection)
  }
}

function verifyOTP (packet = {}) {
  const { schemaManager, oauthApi, config, data } = packet;
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'VerificationModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {
      key: data.key
    };
    const opts = {}
    return method(conditions, null, opts);
  })
  .then(function(verification) {
    if (!verification) {
      return Promise.reject(new Error('key not found'));
    }
    if (!verification.expiredTime) {
      return Promise.reject(new Error('invalid expiredTime'));
    }
    const now = moment();
    const expiredTime = new moment(verification.expiredTime);
    if (now.isAfter(expiredTime)) {
      return Promise.reject(new Error('OTP has been expired'));
    }
    // compare OTP
    if (data.otp != verification.otp) {
      return Promise.reject(new Error('incorrect OTP code'));
    }
    // ok
    verification.verified = true;
    return verification.save();
  })
  .then(function(verification) {
    if (!verification) {
      return Promise.reject(new Error('could not save verification object'));
    }
    return getModelMethodPromise(schemaManager, 'UserModel', 'findById')
    .then(function(method) {
      return method(verification.user, null, null);
    })
    .then(function(user) {
      if (!user) {
        return Promise.reject(new Error(util.format(
          'the user#%s not found', verification.user)));
      }
      if (!user[verification.appType]) {
        return Promise.reject(new Error(util.format(
          'the user#%s[%s] not found', verification.user, verification.appType)));
      }
      user[verification.appType].verified = true;
      user[verification.appType].refreshToken = genKey();
      return [ verification, user.save() ];
    })
  })
  .spread(function(verification, user) {
    const auth = {
      token_type: "Bearer",
      access_token: oauthApi.createAppAccessToken({ user, verification }),
      refresh_token: user[verification.appType].refreshToken,
      expires_in: verification.expiredIn,
    }
    return lodash.assign(packet, {data: { auth, user } })
  });
}

function mappingAppType(appType) {
  if (['sales', 'agent', 'agent-app', 'agentApp'].indexOf(appType) >= 0) {
    return 'agentApp';
  }
  return Promise.reject(new Error(util.format('Unsupported appType [%s]', appType)));
}

function sanitizePhone (data = {}, config = {}) {
  config.defaultCountryCode = config.defaultCountryCode || 'US';
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
    data.phone = parsePhoneNumber(data.phoneNumber, config.defaultCountryCode);
  }
  // validate phone & phoneNumber
  if (!isValidPhoneNumber(data.phoneNumber, config.defaultCountryCode)) {
    return new Error(util.format('Invalid phone number [%s]', data.phoneNumber));
  }
  return null;
}

function parsePhoneNumber(phoneString, defaultCountryCode) {
  const number = phoneUtil.parseAndKeepRawInput(phoneString, defaultCountryCode);
  return {
    country: phoneUtil.getRegionCodeForNumber(number),
    countryCode: '+' + number.getCountryCode(),
    number: number.getNationalNumber(),
    rawInput: number.getRawInput(),
  }
}

function isValidPhoneNumber(phoneString, defaultCountryCode) {
  return phoneUtil.isValidNumber(phoneUtil.parse(phoneString, defaultCountryCode));
}

function ServiceSelector(kwargs = {}) {
  const { serviceResolver, sandboxRegistry } = kwargs;

  assert.ok(this.constructor === ServiceSelector);
  assert.ok(serviceResolver && lodash.isString(serviceResolver));
  assert.ok(sandboxRegistry && lodash.isObject(sandboxRegistry));

  let serviceResolverAvailable = true;

  this.lookupMethod = function (serviceName, methodName) {
    let ref = {};
    if (serviceResolverAvailable) {
      let resolver = sandboxRegistry.lookupService(serviceResolver);
      if (resolver) {
        ref.proxied = true;
        ref.service = resolver.lookupService(serviceName);
        if (ref.service) {
          ref.method = ref.service[methodName];
        }
      } else {
        serviceResolverAvailable = false;
      }
    }
    if (!ref.method) {
      ref.proxied = false;
      ref.service = sandboxRegistry.lookupService(serviceName);
      if (ref.service) {
        ref.method = ref.service[methodName];
      }
    }
    return ref;
  }
}
