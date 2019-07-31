'use strict';

const assert = require('assert');
const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const chores = Devebot.require('chores');
const lodash = Devebot.require('lodash');
const logolite = Devebot.require('logolite');
const format = logolite.LogFormat;
const genKey = logolite.LogConfig.getLogID;
const moment = require('moment');
const util = require('util');
const glpn = require('google-libphonenumber');
const phoneUtil = glpn.PhoneNumberUtil.getInstance();
const otp = require('../utils/otp-generator');
const otpDefaultOpts = { alphabets: false, upperCase: false, specialChars: false };
const mongoose = require('app-datastore').require('mongoose');

const APPTYPE_ADMIN = 'adminApp';
const APPTYPE_AGENT = 'agentApp';

function Handler(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const packageName = params.packageName || 'app-handshake';
  const blockRef = chores.getBlockRef(__filename, packageName);

  const { bcryptor, oauthApi, sandboxRegistry, schemaManager } = params;

  const config = lodash.get(params, ['sandboxConfig'], {});
  config.otpExpiredIn = config.otpExpiredIn || 15 * 60;
  config.otpTypingTime = config.otpTypingTime || 2 * 60;
  config.otpSize = config.otpSize || 7;
  config.smsTemplate = config.smsTemplate ||
    'Please use the code - ${otp} to verify your phone for app authentication';
  config.tokenExpiredIn = config.tokenExpiredIn || 15 * 60;
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
  let serviceSelector;
  if (lodash.isFunction(chores.newServiceSelector)) {
    serviceSelector = chores.newServiceSelector({ serviceResolver, sandboxRegistry });
  } else {
    const ServiceSelector = function (kwargs = {}) {
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
    serviceSelector = new ServiceSelector({ serviceResolver, sandboxRegistry });
  }

  let errorBuilder;
  if (lodash.isFunction(chores.newErrorBuilder)) {
    errorBuilder = chores.newErrorBuilder({
      namespace: 'appHandshake',
      errorCodes: config.errorCodes
    });
  } else {
    errorBuilder = new function ({ namespace, errorCodes }) {
      this.createError = function(errorName, payload) {
        const errInfo = lodash.get(errorCodes, errorName);
        if (errInfo == null) {
          const err = new Error('Unsupported error[' + errorName + ']');
          err.name = errorName;
          err.returnCode = -1;
          err.statusCode = 500;
          return err;
        }
        const err = new Error(errInfo.message);
        err.name = errorName;
        err.returnCode = errInfo.returnCode;
        err.statusCode = errInfo.statusCode;
        if (lodash.isObject(payload)) {
          err.payload = payload;
        }
        return err;
      }
    }({
      namespace: 'appHandshake',
      errorCodes: config.errorCodes
    })
  }

  const ctx = { L, T, packageName, config, schemaManager, serviceSelector,
    errorBuilder, oauthApi, bcryptor };

  function attachServices (packet) {
    return lodash.assign(packet, ctx);
  }

  function detachServices (packet) {
    return lodash.omit(packet, lodash.keys(ctx));
  }

  this.register = function (packet) {
    return validateAppType(packet).then(function(packet) {
      if (packet.appType === APPTYPE_ADMIN) {
        return Promise.resolve(packet)
          .then(attachServices)
          .then(loginAdminApp)
          .then(detachServices);
      }
      return Promise.resolve(packet)
        .then(attachServices)
        .then(upsertDevice)
        .then(validateUser)
        .then(generateOTP)
        .then(sendOTP)
        .then(registerEnd)
        .then(detachServices);
    })
  }

  this.verificationCode = function (packet) {
    return Promise.resolve(packet)
      .then(attachServices)
      .then(verifyOTP)
      .then(detachServices);
  }

  this.refreshToken = function (packet) {
    return validateAppType(packet)
      .then(attachServices)
      .then(refreshToken)
      .then(detachServices);
  }

  this.revokeToken = function (packet) {
    return validateAppType(packet)
      .then(attachServices)
      .then(revokeToken)
      .then(detachServices);
  }

  this.updateUser = function (packet) {
    return validateAppType(packet)
      .then(attachServices)
      .then(updateUser)
      .then(detachServices);
  }

  this.resetVerification = function (packet) {
    return validateAppType(packet)
      .then(attachServices)
      .then(resetVerification)
      .then(detachServices);
  }
};

Handler.referenceHash = {
  bcryptor: 'bcryptor',
  oauthApi: 'oauthApi',
  sandboxRegistry: 'devebot/sandboxRegistry',
  schemaManager: 'app-datastore/schemaManager'
};

module.exports = Handler;

function getModelMethodPromise (schemaManager, modelName, methodName) {
  const model = schemaManager.getModel(modelName);
  if (!model) {
    return Promise.reject(new Error(modelName + '_not_available'));
  }
  return Promise.resolve(Promise.promisify(model[methodName], { context: model }));
}

function loginAdminApp (packet = {}) {
  const { bcryptor, oauthApi, schemaManager, errorBuilder, config, appType, data } = packet;
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {};
    conditions[[appType, "username"].join(".")] = data.username;
    return method(conditions, null, {});
  })
  .then(function(user) {
    if (!user) {
      return Promise.reject(errorBuilder.createError('UserNotFound', {
        appType: appType,
        username: data.username
      }));
    }
    if (user.activated == false) {
      return Promise.reject(errorBuilder.createError('UserIsLocked', {
        appType: appType,
        username: data.username
      }));
    }
    if (user.deleted == true) {
      return Promise.reject(errorBuilder.createError('UserIsDeleted', {
        appType: appType,
        username: data.username
      }));
    }
    // verify the password
    const encPasswd = lodash.get(user, [appType, 'password'], null);
    if (encPasswd === null) {
      return Promise.reject(errorBuilder.createError('PasswordNotFound', {
        appType: appType,
        username: data.username
      }));
    }
    return bcryptor.compare(data.password, encPasswd).then(function(matched) {
      if (matched) {
        lodash.assign(user[appType], { verified: true, refreshToken: genKey() });
        return user.save();
      } else {
        return Promise.reject(errorBuilder.createError('PasswordIsMismatched', {
          appType: appType,
          username: data.username
        }));
      }
    });
  })
  .then(function(user) {
    if (user && lodash.isFunction(user.toJSON)) {
      user = user.toJSON();
    }
    const now = moment();
    const expiredIn = config.otpExpiredIn;
    const expiredTime = now.add(config.otpExpiredIn, 'seconds').toDate();
    const auth = {
      token_type: "Bearer",
      access_token: oauthApi.createAppAccessToken({
        user,
        constraints: {
          appType, expiredIn, expiredTime,
          email: user[appType].email,
          username: user[appType].username,
          permissions: user[appType].permissions || [],
        },
      }),
      refresh_token: user[appType].refreshToken,
      expires_in: expiredIn,
    }
    return lodash.assign(packet, {data: { auth, user } });
  });
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
  const { schemaManager, errorBuilder, config, appType, data, device } = packet;
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOneAndUpdate');
  })
  .then(function(method) {
    const err = sanitizePhone(data, config, errorBuilder);
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

function validateUser (packet = {}) {
  const { schemaManager, errorBuilder, config, appType, data, device } = packet;
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  })
  .then(function(method) {
    const err = sanitizePhone(data, config, errorBuilder);
    if (err) {
      return Promise.reject(err);
    }

    const conditions = {};
    conditions[[appType, "phoneNumber"].join(".")] = data.phoneNumber;

    return method(conditions, null, {});
  })
  .then(function(user) {
    if (!user) {
      if (config.rejectUnknownUser === false) {
        const user = {};
        user[appType] = { device };
        assignUserData(appType, user, data);
        const userCreate = getModelMethodPromise(schemaManager, 'UserModel', 'create');
        return userCreate.then(function(method) {
          const opts = {};
          return method([user], opts).spread(function(user) {
            return user;
          });
        });
      } else {
        return Promise.reject(errorBuilder.createError('UserNotFound', {
          phoneNumber: data.phoneNumber
        }));
      }
    }
    if (user.activated == false) {
      return Promise.reject(errorBuilder.createError('UserIsLocked', {
        phoneNumber: data.phoneNumber
      }));
    }
    if (user.deleted == true) {
      return Promise.reject(errorBuilder.createError('UserIsDeleted', {
        phoneNumber: data.phoneNumber
      }));
    }
    lodash.assign(user[appType], { device: device });
    return user.save();
  })
  .then(function(user) {
    return lodash.assign(packet, { user });
  });
}

function generateOTP (packet = {}) {
  const { schemaManager, errorBuilder, config, appType, data, user, device } = packet;
  return Promise.resolve().then(function() {
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
    const nowPlus = now.add(config.otpTypingTime, 'seconds');
    if (verification) {
      if (verification.expiredTime) {
        const oldExpiredTime = new moment(verification.expiredTime);
        if (nowPlus.isAfter(oldExpiredTime)) {
          // there is no time to press the received token, create another verification
          verification = null;
        } else {
          lodash.assign(packet, { skipped: true });
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
          expiredIn: config.otpExpiredIn,
          expiredTime: now.add(config.otpExpiredIn, 'seconds').toDate(),
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
  const { packageName, config, serviceSelector, verification, skipped } = packet;
  if (skipped === true) {
    return Promise.resolve(packet);
  }
  const messenderService = [packageName, 'messender'].join(chores.getSeparator());
  const ref = serviceSelector.lookupMethod(messenderService, 'sendSMS');
  if (ref.service && ref.method) {
    ref.method({
      text: format(config.smsTemplate, { otp: verification.otp }),
      phoneNumber: verification.phoneNumber,
    });
  }
  return Promise.resolve(packet);
}

function registerEnd (packet = {}) {
  const { config, verification } = packet;
  return {
    data: lodash.pick(verification, config.projection)
  }
}

function verifyOTP (packet = {}) {
  const { schemaManager, errorBuilder, oauthApi, config, data } = packet;
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
      return Promise.reject(errorBuilder.createError('VerificationKeyNotFound', {
        key: data.key,
      }));
    }
    if (!verification.expiredTime) {
      return Promise.reject(errorBuilder.createError('VerificationExpiredTimeIsEmpty', {
        key: data.key,
      }));
    }
    const now = moment();
    const expiredTime = new moment(verification.expiredTime);
    if (now.isAfter(expiredTime)) {
      return Promise.reject(errorBuilder.createError('OTPHasExpired', {
        key: data.key,
        expiredTime: expiredTime,
      }));
    }
    // compare OTP
    if (data.otp != verification.otp) {
      return Promise.reject(errorBuilder.createError('OTPIncorrectCode', {
        key: data.key,
      }));
    }
    // ok
    verification.verified = true;
    return verification.save();
  })
  .then(function(verification) {
    if (!verification) {
      return Promise.reject(errorBuilder.createError('VerificationCouldNotBeSaved', {
        key: data.key,
      }));
    }
    return getModelMethodPromise(schemaManager, 'UserModel', 'findById')
    .then(function(method) {
      return method(verification.user, null, null);
    })
    .then(function(user) {
      if (!user) {
        return Promise.reject(errorBuilder.createError('VerificationUserNotFound', {
          key: data.key,
        }));
      }
      if (!user[verification.appType]) {
        return Promise.reject(errorBuilder.createError('VerificationUserAppTypeNotFound', {
          key: data.key,
          appType: verification.appType,
        }));
      }
      user[verification.appType].verified = true;
      user[verification.appType].refreshToken = genKey();
      return [ user.save(), verification ];
    })
  })
  .spread(function(user, verification) {
    if (user && lodash.isFunction(user.toJSON)) {
      user = user.toJSON();
    }
    const auth = {
      token_type: "Bearer",
      access_token: oauthApi.createAppAccessToken({
        user,
        constraints: lodash.pick(verification, [
          "appType", "expiredIn", "expiredTime", "phoneNumber"
        ])
      }),
      refresh_token: user[verification.appType].refreshToken,
      expires_in: verification.expiredIn,
    }
    return lodash.assign(packet, {data: { auth, user } })
  });
}

function refreshToken (packet = {}) {
  const { schemaManager, errorBuilder, oauthApi, config, appType, data } = packet;
  // search user[appType].refreshToken
  return Promise.resolve()
  .then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {};
    conditions[[appType, "refreshToken"].join(".")] = data.refreshToken;
    const opts = {};
    return method(conditions, null, opts);
  })
  .then(function(user) {
    if (!user) {
      return Promise.reject(errorBuilder.createError('RefreshTokenNotFound'));
    }
    if (user[appType].verified == false) {
      return Promise.reject(errorBuilder.createError('UserIsNotVerified'));
    }
    const now = moment();
    const expiredIn = config.tokenExpiredIn;
    const expiredTime = now.add(config.tokenExpiredIn, 'seconds');
    let constraints = { appType, expiredIn, expiredTime };
    if (appType === APPTYPE_ADMIN) {
      constraints = lodash.assign(constraints, {
        email: user[appType].email,
        username: user[appType].username,
        permissions: user[appType].permissions || [],
      });
    }
    if (appType === APPTYPE_AGENT) {
      constraints = lodash.assign(constraints, {
        phoneNumber: user[appType].phoneNumber,
      });
    }
    const auth = {
      token_type: "Bearer",
      access_token: oauthApi.createAppAccessToken({ user, constraints }),
      refresh_token: user[appType].refreshToken,
      expires_in: expiredIn,
    }
    return lodash.assign(packet, { data: { auth } });
  });
}

function updateUser (packet = {}) {
  const { bcryptor, schemaManager, errorBuilder, config, appType, data = {} } = packet;

  let p = getModelMethodPromise(schemaManager, 'UserModel', 'findOne');

  if (appType === APPTYPE_ADMIN) {
    if (!data['holderId'] && !data['username']) {
      return Promise.reject(errorBuilder.createError('AdminAppHolderIdOrUsernameExpected',
        lodash.pick(data, ['holderId', 'username'])));
    }
    p = p.then(function(method) {
      // query an user by the holderId
      let findByHolderId = Promise.resolve();
      if (data['holderId']) {
        const conditions = {};
        conditions[[appType, 'holderId'].join(".")] = data['holderId'];
        findByHolderId = method(conditions, null, {});
      }
      // query an user by the username
      let findByUsername = Promise.resolve();
      if (data['username']) {
        const conditions = {};
        conditions[[appType, 'username'].join(".")] = data['username'];
        findByUsername = method(conditions, null, {});
      }
      // make the query
      return Promise.all([findByHolderId, findByUsername])
      .spread(function(byHolderId, byUsername) {
        if (byHolderId) {
          if (byUsername) {
            if (byHolderId._id.toString() !== byUsername._id.toString()) {
              return Promise.reject(errorBuilder.createError('UsernameHasOccupied', {
                holderId: data['holderId'],
                username: data['username']
              }));
            }
          }
          assignUserData(appType, byHolderId, data, bcryptor);
          return byHolderId.save();
        } else {
          if (byUsername) {
            assignUserData(appType, byUsername, data, bcryptor);
            return byUsername.save();
          } else {
            const user = {};
            assignUserData(appType, user, data, bcryptor);
            const userCreate = getModelMethodPromise(schemaManager, 'UserModel', 'create');
            return userCreate.then(function(method) {
              const opts = {};
              return method([user], opts).spread(function(user) {
                return user;
              });
            });
          }
        }
      })
    });
  }

  if (appType === APPTYPE_AGENT) {
    if (!data['holderId'] && !data['phoneNumber']) {
      return Promise.reject(errorBuilder.createError('AgentAppHolderIdOrPhoneNumberExpected',
        lodash.pick(data, ['holderId', 'phoneNumber'])));
    }
    p = p.then(function(method) {
      // sanitize the phone number
      const err = sanitizePhone(data, config, errorBuilder);
      if (err) {
        return Promise.reject(err);
      }
      // query an user by the holderId
      let findByHolderId = Promise.resolve();
      if (data['holderId']) {
        const conditions = {};
        conditions[[appType, 'holderId'].join(".")] = data['holderId'];
        findByHolderId = method(conditions, null, {});
      }
      // query an user by the phoneNumber
      let findByPhoneNumber = Promise.resolve();
      if (data['phoneNumber']) {
        const conditions = {};
        conditions[[appType, 'phoneNumber'].join(".")] = data['phoneNumber'];
        findByPhoneNumber = method(conditions, null, {});
      }
      // make the query
      return Promise.all([findByHolderId, findByPhoneNumber])
      .spread(function(userById, user) {
        if (userById) {
          if (user) {
            if (userById._id.toString() !== user._id.toString()) {
              return Promise.reject(errorBuilder.createError('PhoneNumberHasOccupied', {
                holderId: data['holderId'],
                phoneNumber: data['phoneNumber']
              }));
            }
          }
          assignUserData(appType, userById, data, bcryptor);
          return userById.save();
        } else {
          if (user) {
            assignUserData(appType, user, data, bcryptor);
            return user.save();
          } else {
            const user = {};
            assignUserData(appType, user, data, bcryptor);
            const userCreate = getModelMethodPromise(schemaManager, 'UserModel', 'create');
            return userCreate.then(function(method) {
              const opts = {};
              return method([user], opts).spread(function(user) {
                return user;
              });
            });
          }
        }
      })
    });
  }

  p = p.then(function(user) {
    if (user && lodash.isFunction(user.toJSON)) {
      user = user.toJSON();
    }
    return lodash.assign(packet, { user });
  });

  return p;
}

function resetVerification (packet = {}) {
  const { schemaManager, errorBuilder, config, appType, data } = packet;

  let p = getModelMethodPromise(schemaManager, 'VerificationModel', 'findOne');

  if (appType === APPTYPE_AGENT) {
    if (!lodash.isString(data.phoneNumber) || lodash.isEmpty(data.phoneNumber)) {
      return Promise.reject(errorBuilder.createError('PhoneNumberMustBeNotNull'));
    }
    p = p.then(function(method) {
      const conditions = {
        appType: appType,
        phoneNumber: data.phoneNumber
      };
      const opts = {
        sort: { expiredTime: -1 }
      }
      return method(conditions, null, opts);
    });
  }

  p = p.then(function(verification) {
    if (verification) {
      const now = moment().subtract(config.otpTypingTime, 'seconds');
      verification.expiredTime = now;
      return verification.save();
    }
    return verification;
  });

  return p.then(function(verification) {
    if (verification) {
      return lodash.assign(packet, { data: { affected: 1 } });
    } else {
      return lodash.assign(packet, { data: { affected: 0 } });
    }
  });
}

const MIRROR_USER_FIELDS = ['firstName', 'lastName', 'email', 'activated', 'deleted'];

function assignUserData (appType, user = {}, data = {}, bcryptor) {
  lodash.forEach(MIRROR_USER_FIELDS, function(field) {
    if (field in data) {
      user[field] = data[field];
    }
  });
  user[appType] = user[appType] || {};

  if (lodash.isArray(data.permissions) && !lodash.isEmpty(data.permissions)) {
    user[appType].permissions = data.permissions;
  }

  if (appType === APPTYPE_ADMIN) {
    if (lodash.isString(data.username) && data.username != user[appType].username) {
      // change the phoneNumber -> verified <- false, delete refreshToken
      user[appType].username = data.username;
      user[appType].refreshToken = undefined;
    }
    if (lodash.isString(data.password) && !lodash.isEmpty(data.password)) {
      user[appType].password = bcryptor.hashSync(data.password);
      user[appType].refreshToken = undefined;
    }
  }

  if (appType === APPTYPE_AGENT) {
    if (lodash.isString(data.phoneNumber) && data.phoneNumber != user[appType].phoneNumber) {
      // change the phoneNumber -> verified <- false, delete refreshToken
      user[appType].phone = data.phone;
      user[appType].phoneNumber = data.phoneNumber;
      user[appType].refreshToken = undefined;
      user[appType].verified = false;
    }
  }

  if (lodash.isString(data.holderId) && data.holderId != user[appType].holderId) {
    user[appType].holderId = new mongoose.Types.ObjectId(data.holderId);
  }
  return user;
}

function revokeToken (packet = {}) {
  const { schemaManager, config, appType, data } = packet;
  let p = getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  if (appType === APPTYPE_ADMIN) {
    p = p.then(function(method) {
      const conditions = {};
      conditions[[appType, "username"].join(".")] = data.username;
      return method(conditions, null, {});
    });
  }
  if (appType === APPTYPE_AGENT) {
    p = p.then(function(method) {
      const conditions = {};
      conditions[[appType, "phoneNumber"].join(".")] = data.phoneNumber;
      return method(conditions, null, {});
    });
  }
  p = p.then(function(user) {
    if (user) {
      user[appType].refreshToken = undefined;
      return user.save();
    }
    return Promise.resolve({});
  });
  return p;
}

function sanitizeAppType(appType) {
  if (['adminApp', 'admin', 'cc', 'operation'].indexOf(appType) >= 0) {
    return APPTYPE_ADMIN;
  }
  if (['agentApp', 'agent', 'agent-app', 'sales'].indexOf(appType) >= 0) {
    return APPTYPE_AGENT;
  }
  return null;
}

function validateAppType (packet) {
  const appType = sanitizeAppType(packet.appType);
  if (appType == null) {
    return Promise.reject(new Error(util.format('Unsupported appType [%s]', packet.appType)));
  }
  packet.appType = appType;
  return Promise.resolve(packet);
}

function sanitizePhone (data = {}, config = {}, errorBuilder) {
  config.defaultCountryCode = config.defaultCountryCode || 'US';
  if (lodash.isEmpty(data.phoneNumber) && lodash.isEmpty(data.phone)) {
    return errorBuilder.createError('PhoneNumberMustBeNotNull');
  }
  // sync between data.phone and data.phoneNumber
  if (data.phone) {
    // build the derived phoneNumber
    let derivativeNumber = data.phone.countryCode + data.phone.number;
    if (data.phoneNumber) {
      if (data.phoneNumber !== derivativeNumber) {
        return errorBuilder.createError('PhoneNumberMismatched', {
          phoneNumber: data.phoneNumber, phone: data.phone
        });
      }
    } else {
      data.phoneNumber = derivativeNumber;
    }
  } else {
    data.phone = parsePhoneNumber(data.phoneNumber, config.defaultCountryCode);
  }
  // validate phone & phoneNumber
  if (!isValidPhoneNumber(data.phoneNumber, config.defaultCountryCode)) {
    return errorBuilder.createError('PhoneNumberIsInvalid', {
      phoneNumber: data.phoneNumber
    });
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
