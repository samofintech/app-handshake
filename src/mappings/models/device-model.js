'use strict';

const mongoose = require('app-datastore').require('mongoose');
const Schema = mongoose.Schema;

/**
 *
 * Device Model
 */

module.exports = {
  name: 'DeviceModel',
  descriptor: {
    imei: { type: String },
    platform: { type: String },
    // Filtering
    activated: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    tags: [String],
    // Auditing
    createdBy: { type: String },
    createdAt: { type: Date },
    updatedBy: { type: String },
    updatedAt: { type: Date, default: Date.now }
  },
  options: {
    collection: 'devices'
  }
};
