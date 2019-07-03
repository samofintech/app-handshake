'use strict';

const CorporateModel = require('./models/corporate-model');
const DeviceModel = require('./models/device-model');
const UserModel = require('./models/user-model');
const VerificationModel = require('./models/verification-model');

module.exports = [
  CorporateModel,
  DeviceModel,
  VerificationModel,
  UserModel,
];
