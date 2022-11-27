"use strict";

const mongoose = require("app-datastore").require("mongoose");
const Schema = mongoose.Schema;

/**
 *
 * User Model
 */
module.exports = {
  name: "UserModel",
  descriptor: {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    gender: { type: String },
    avatar: { type: String },
    adminApp: {
      email: { type: String },
      username: { type: String },
      password: { type: String },
      permissions: [String],
      permissionGroups: [String],
      holderId: { type: Schema.Types.ObjectId },
      verified: { type: Boolean, default: false },
      refreshToken: { type: String }
    },
    agentApp: {
      device: { type: Schema.Types.ObjectId, ref: "DeviceModel" },
      phoneNumber: { type: String },
      phone: {
        country: { type: String },
        countryCode: { type: String },
        number: { type: String }
      },
      // 0.3.16
      email: { type: String },
      username: { type: String },
      password: { type: String },
      permissions: [String],
      permissionGroups: [String],
      // End 0.3.16
      holderId: { type: Schema.Types.ObjectId },
      verified: { type: Boolean, default: false },
      refreshToken: { type: String }
    },
    customerApp: {
      device: { type: Schema.Types.ObjectId, ref: "DeviceModel" },
      phoneNumber: { type: String },
      phone: {
        country: { type: String },
        countryCode: { type: String },
        number: { type: String }
      },
      // 0.3.16
      email: { type: String },
      username: { type: String },
      password: { type: String },
      permissions: [String],
      permissionGroups: [String],
      // End 0.3.16
      holderId: { type: Schema.Types.ObjectId },
      verified: { type: Boolean, default: false },
      refreshToken: { type: String }
    },
    clientApp: {
      email: { type: String },
      tokenKey: { type: String },
      tokenSecret: { type: String },
      holderId: { type: Schema.Types.ObjectId },
      verified: { type: Boolean, default: false },
      refreshToken: { type: String }
    },
    // Filtering
    activated: { type: Boolean },
    deleted: { type: Boolean, default: false },
    tags: [String],
    // Auditing
    createdBy: { type: String },
    createdAt: { type: Date },
    updatedBy: { type: String },
    updatedAt: { type: Date, default: Date.now }
  },
  options: {
    collection: "users"
  }
};
