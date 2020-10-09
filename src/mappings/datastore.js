'use strict';

const DeviceModel = require('./models/device-model');
const FixedotpModel = require('./models/fixedotp-model');
const UserModel = require('./models/user-model');
const VerificationModel = require('./models/verification-model');
const PermissionGroupModel = require('./models/permission-group-model');

module.exports = [
  DeviceModel,
  FixedotpModel,
  UserModel,
  VerificationModel,
  PermissionGroupModel
];
