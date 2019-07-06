'use strict';

const mongoose = require('app-datastore').require('mongoose');
const Schema = mongoose.Schema;

/**
 *
 * Device Verification Model
 */
module.exports = {
  name: 'VerificationModel',
  descriptor: {
    key: { type: String },
    otp: { type: String },
    expiredIn: { type: Number },
    expiredTime: { type: Date },
    user: { type: Schema.Types.ObjectId, ref: "UserModel" },
    device: { type: Schema.Types.ObjectId, ref: "DeviceModel" },
    appType: { type: String },
    phoneNumber: { type: String },
    verified: { type: Boolean, default: false },
    // Filtering
    tags: [String],
    deleted: { type: Boolean, default: false },
    // Auditing
    createdAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
  },
  options: {
    collection: 'verifications'
  }
};
