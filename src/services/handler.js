'use strict';

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

  const { bcryptor, oauthApi, errorManager, sandboxRegistry, schemaManager } = params;

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
  const serviceSelector = chores.newServiceSelector({ serviceResolver, sandboxRegistry });

  const errorBuilder = errorManager.register(packageName, {
    errorCodes: config.errorCodes
  });

  const ctx = { L, T, packageName, config, schemaManager, serviceSelector,
    errorBuilder, oauthApi, bcryptor };

  function attachServices (packet) {
    return lodash.assign(packet, ctx);
  }

  function detachServices (packet) {
    return lodash.omit(packet, lodash.keys(ctx));
  }

  this.register = function (packet, options) {
    return validateAppType(injectOptions(packet, options)).then(function(packet) {
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

  this.verificationCode = function (packet, options) {
    return validateAppType(injectOptions(packet, options))
      .then(attachServices)
      .then(verifyOTP)
      .then(detachServices);
  }

  this.refreshToken = function (packet, options) {
    return validateAppType(injectOptions(packet, options))
      .then(attachServices)
      .then(refreshToken)
      .then(detachServices);
  }

  this.revokeToken = function (packet, options) {
    return validateAppType(injectOptions(packet, options))
      .then(attachServices)
      .then(revokeToken)
      .then(detachServices);
  }

  this.updateUser = function (packet, options) {
    return validateAppType(injectOptions(packet, options))
      .then(attachServices)
      .then(updateUser)
      .then(filterUserInfo)
      .then(detachServices);
  }

  this.getVerification = function (packet, options) {
    return validateAppType(injectOptions(packet, options))
      .then(attachServices)
      .then(getVerification)
      .then(detachServices);
  }

  this.resetVerification = function (packet, options) {
    return validateAppType(injectOptions(packet, options))
      .then(attachServices)
      .then(resetVerification)
      .then(detachServices);
  }
};

Handler.referenceHash = {
  bcryptor: 'bcryptor',
  oauthApi: 'oauthApi',
  errorManager: 'app-errorlist/manager',
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
  const { bcryptor, oauthApi, schemaManager, errorBuilder, config, appType, language, data } = packet;
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {};
    conditions[[appType, "username"].join(".")] = data.username;
    return method(conditions, null, {});
  })
  .then(function(user) {
    return _checkUser(packet, user);
  })
  .then(function(user) {
    // verify the password
    const encPasswd = lodash.get(user, [appType, 'password'], null);
    if (encPasswd === null) {
      return Promise.reject(errorBuilder.newError('PasswordNotFound', { payload: {
        appType: appType,
        username: data.username
      }, language }));
    }
    return bcryptor.compare(data.password, encPasswd).then(function(matched) {
      if (matched) {
        lodash.assign(user[appType], { verified: true, refreshToken: genKey() });
        return user.save();
      } else {
        return Promise.reject(errorBuilder.newError('PasswordIsMismatched', { payload: {
          appType: appType,
          username: data.username
        }, language }));
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
      expired_time: expiredTime,
    }
    return lodash.assign(packet, { data: { auth, user } });
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

function _findUserByHolderId({ schemaManager, config, appType, data, errorBuilder, language }) {
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  })
  .then(function(method) {
    const conditions = {};
    conditions[[appType, "holderId"].join(".")] = data.holderId;

    return method(conditions, null, {});
  })
}

function _findUserByPhoneNumber({ schemaManager, config, appType, data, errorBuilder, language }) {
  return Promise.resolve().then(function() {
    return getModelMethodPromise(schemaManager, 'UserModel', 'findOne');
  })
  .then(function(method) {
    const err = sanitizePhone(data, config, errorBuilder, language);
    if (err) {
      return Promise.reject(err);
    }

    const conditions = {};
    conditions[[appType, "phoneNumber"].join(".")] = data.phoneNumber;

    return method(conditions, null, {});
  })
}

function validateUser (packet = {}) {
  const { schemaManager, config, appType, data, device } = packet;
  return _findUserByPhoneNumber(packet)
  .then(function(user) {
    if (!user && config.rejectUnknownUser === false) {
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
    }
    return _checkUser(packet, user).then(function(user) {
      lodash.assign(user[appType], { device: device });
      return user.save();
    })
  })
  .then(function(user) {
    return lodash.assign(packet, { user });
  });
}

function generateOTP (packet = {}) {
  const { T, L } = packet;
  const { schemaManager, errorBuilder, config, appType, language, user, device } = packet;
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
        const oldExpiredTime = moment(verification.expiredTime);
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
        return matchFixedOTP(packet, obj.phoneNumber).then(function (fixedOTP) {
          if (fixedOTP != null) {
            obj.otp = fixedOTP;
            lodash.assign(packet, { skipped: true });
          }
          const opts = {};
          return method([obj], opts).spread(function(otp) {
            return otp;
          });
        });
      });
    }
  })
  .then(function(verification) {
    if (!verification) {
      return Promise.reject(errorBuilder.newError('VerificationCouldNotBeCreated', {
        payload: {
          appType: appType,
        },
        language
      }));
    }
    return lodash.assign(packet, { verification });
  })
}

function sendOTP (packet = {}) {
  const { T, L } = packet;
  const { packageName, config, serviceSelector, verification, skipped, options } = packet;
  if (skipped === true) {
    return Promise.resolve(packet);
  }
  const messenderService = [packageName, 'messender'].join(chores.getSeparator());
  const ref = serviceSelector.lookupMethod(messenderService, 'sendSMS');
  if (ref.service && ref.method) {
    L.has('debug') && L.log('debug', T.add({
      phoneNumber: verification.phoneNumber
    }).toMessage({
      tmpl: 'An OTP has been created for phone: ${phoneNumber}'
    }))
    const msgInfo = {
      text: format(config.smsTemplate, { otp: verification.otp }),
      phoneNumber: verification.phoneNumber,
    }
    Promise.resolve(ref.method(msgInfo, options)).then(function(smsResult) {
      L.has('debug') && L.log('debug', T.add({ smsResult }).toMessage({
        tmpl: 'SendSMS result: ${smsResult}'
      }))
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
  const { schemaManager, errorBuilder, oauthApi, appType, language, data } = packet;
  if (appType !== APPTYPE_AGENT) {
    return Promise.reject(errorBuilder.newError('MethodUnsupportedForAppType', {
      payload: {
        appType: appType,
        method: 'verifyOTP'
      },
      language
    }));
  }
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
      return Promise.reject(errorBuilder.newError('VerificationKeyNotFound', { payload: {
        key: data.key,
      }, language }));
    }
    if (!verification.expiredTime) {
      return Promise.reject(errorBuilder.newError('VerificationExpiredTimeIsEmpty', { payload: {
        key: data.key,
      }, language }));
    }
    const now = moment();
    const expiredTime = moment(verification.expiredTime);
    if (now.isAfter(expiredTime)) {
      return Promise.reject(errorBuilder.newError('OTPHasExpired', { payload: {
        key: data.key,
        expiredTime: expiredTime,
      }, language }));
    }
    // compare OTP
    if (data.otp != verification.otp) {
      return Promise.reject(errorBuilder.newError('OTPIncorrectCode', { payload: {
        key: data.key,
      }, language }));
    }
    // ok
    verification.verified = true;
    return verification.save();
  })
  .then(function(verification) {
    if (!verification) {
      return Promise.reject(errorBuilder.newError('VerificationCouldNotBeUpdated', { payload: {
        key: data.key,
      }, language }));
    }
    return getModelMethodPromise(schemaManager, 'UserModel', 'findById')
    .then(function(method) {
      return method(verification.user, null, null);
    })
    .then(function(user) {
      if (!user) {
        return Promise.reject(errorBuilder.newError('VerificationUserNotFound', { payload: {
          key: data.key,
        }, language }));
      }
      if (!user[verification.appType]) {
        return Promise.reject(errorBuilder.newError('VerificationUserAppTypeNotFound', { payload: {
          key: data.key,
          appType: verification.appType,
        }, language }));
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
      expired_time: verification.expiredTime,
    }
    return lodash.assign(packet, { data: { auth, user } })
  });
}

function refreshToken (packet = {}) {
  const { schemaManager, errorBuilder, oauthApi, config, appType, language, data } = packet;
  const { revisions } = config;
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
      return Promise.reject(errorBuilder.newError('RefreshTokenNotFound', { language }));
    }
    if (user[appType].verified == false) {
      return Promise.reject(errorBuilder.newError('UserIsNotVerified', { language }));
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
      expired_time: expiredTime,
      revisions: revisions,
    }
    return lodash.assign(packet, { data: { auth } });
  });
}

function filterUserInfo (packet = {}) {
  const { appType, user = {} } = packet;

  let data = lodash.assign({
    userId: user._id,
  }, lodash.pick(user, ['firstName', 'lastName', 'email', 'activated', 'deleted', 'tags']));

  if (appType === APPTYPE_ADMIN) {
    data = lodash.assign(data, lodash.pick(lodash.get(user, appType), [
      'holderId', 'username', 'permissions'
    ]));
  }

  if (appType === APPTYPE_AGENT) {
    data = lodash.assign(data, lodash.pick(lodash.get(user, appType), [
      'holderId', 'phoneNumber'
    ]));
  }

  return lodash.assign(packet, { data });
}

function updateUser (packet = {}) {
  const { bcryptor, schemaManager, errorBuilder, config, appType, language, data = {} } = packet;

  let p = getModelMethodPromise(schemaManager, 'UserModel', 'findOne');

  if (appType === APPTYPE_ADMIN) {
    if (!data['holderId'] && !data['username']) {
      return Promise.reject(errorBuilder.newError('AdminAppHolderIdOrUsernameExpected',
      { payload: lodash.pick(data, ['holderId', 'username']), language }));
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
              return Promise.reject(errorBuilder.newError('UsernameHasOccupied', { payload: {
                holderId: data['holderId'],
                username: data['username']
              }, language }));
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
      return Promise.reject(errorBuilder.newError('AgentAppHolderIdOrPhoneNumberExpected',
      { payload: lodash.pick(data, ['holderId', 'phoneNumber']), language }));
    }
    p = p.then(function(method) {
      // sanitize the phone number
      const err = sanitizePhone(data, config, errorBuilder, language);
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
              return Promise.reject(errorBuilder.newError('PhoneNumberHasOccupied', { payload: {
                holderId: data['holderId'],
                phoneNumber: data['phoneNumber']
              }, language }));
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

function getVerification (packet = {}) {
  const { appType, data } = packet;

  let p = Promise.resolve();
  if (appType === APPTYPE_AGENT) {
    if (data.holderId) {
      p = _findUserByHolderId(packet);
    }
    if (data.phoneNumber) {
      p = _findUserByPhoneNumber(packet);
    }
  }

  p = p.then(function(user) {
    return _checkUser(packet, user);
  })
  .then(function(user) {
    return generateOTP(lodash.assign(packet, { user, device: lodash.pick(user, [appType, 'device']) }));
  })
  .then(function({ verification }) {
    return lodash.assign(packet, {
      data: lodash.pick(verification, ['key', 'otp', 'expiredIn', 'expiredTime', 'verified'])
    });
  });

  return p;
}

function resetVerification (packet = {}) {
  const { schemaManager, errorBuilder, config, appType, language, data } = packet;

  let p = getModelMethodPromise(schemaManager, 'VerificationModel', 'findOne');

  if (appType === APPTYPE_AGENT) {
    if (!lodash.isString(data.phoneNumber) || lodash.isEmpty(data.phoneNumber)) {
      return Promise.reject(errorBuilder.newError('PhoneNumberMustBeNotNull', { language }));
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
  const { schemaManager, appType, data } = packet;
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

function injectOptions (packet = {}, options) {
  return Object.assign(packet, { options });
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

function sanitizePhone (data = {}, config = {}, errorBuilder, language) {
  config.defaultCountryCode = config.defaultCountryCode || 'US';
  if (lodash.isEmpty(data.phoneNumber) && lodash.isEmpty(data.phone)) {
    return errorBuilder.newError('PhoneNumberMustBeNotNull', { language });
  }
  // sync between data.phone and data.phoneNumber
  if (data.phone) {
    // build the derived phoneNumber
    let derivativeNumber = data.phone.countryCode + data.phone.number;
    if (data.phoneNumber) {
      if (data.phoneNumber !== derivativeNumber) {
        return errorBuilder.newError('PhoneNumberMismatched', { payload: {
          phoneNumber: data.phoneNumber, phone: data.phone
        }, language });
      }
    } else {
      data.phoneNumber = derivativeNumber;
    }
  } else {
    data.phone = parsePhoneNumber(data.phoneNumber, config.defaultCountryCode);
  }
  // validate phone & phoneNumber
  if (!isValidPhoneNumber(data.phoneNumber, config.defaultCountryCode)) {
    return errorBuilder.newError('PhoneNumberIsInvalid', { payload: {
      phoneNumber: data.phoneNumber
    }, language });
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

function matchFixedOTP (packet = {}, phoneNumber) {
  const { config, schemaManager } = packet;
  if (lodash.isArray(config.presetOTPs) && !lodash.isEmpty(config.presetOTPs)) {
    for (const i in config.presetOTPs) {
      const pair = config.presetOTPs[i];
      if (pair.enabled !== false && lodash.isString(pair.phoneNumber) && lodash.isString(pair.otp)) {
        if (pair.phoneNumber === phoneNumber) {
          return Promise.resolve(pair.otp);
        }
      }
    }
  } else {
    return getModelMethodPromise(schemaManager, 'FixedotpModel', 'findOne')
    .then(function(method) {
      const conditions = {
        phoneNumber: phoneNumber
      };
      const opts = {};
      return method(conditions, null, opts);
    })
    .then(function(fixedotp) {
      if (fixedotp && fixedotp.enabled !== false) {
        return fixedotp.otp;
      } else {
        return null;
      }
    });
  }
  return Promise.resolve(null);
}

function _extractUserQuery(appType, data) {
  return lodash.assign({ appType }, lodash.pick(data, ['holderId', 'phoneNumber', 'username']));
}

function _checkUser ({ appType, errorBuilder, language, data }, user) {
  if (!user) {
    return Promise.reject(errorBuilder.newError('UserNotFound', {
      payload: _extractUserQuery(appType, data),
      language
    }));
  }
  if (user.activated == false) {
    return Promise.reject(errorBuilder.newError('UserIsLocked', {
      payload: _extractUserQuery(appType, data),
      language
    }));
  }
  if (user.deleted == true) {
    return Promise.reject(errorBuilder.newError('UserIsDeleted', {
      payload: _extractUserQuery(appType, data),
      language
    }));
  }
  return Promise.resolve(user);
}
