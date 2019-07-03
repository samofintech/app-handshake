'use strict';

var mongoose = require('app-datastore').require('mongoose');
var Schema = mongoose.Schema;

/**
 *
 * Corporate Model
 */

module.exports = {
  name: 'CorporateModel',
  descriptor: {
    name: { type: String },
    code: { type: String },
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
    collection: 'corporates'
  }
};
