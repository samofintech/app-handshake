"use strict";

var mongoose = require("app-datastore").require("mongoose");
var Schema = mongoose.Schema;

/**
 *
 * User Model
 */
module.exports = {
  name: "UserGroupModel",
  descriptor: {
    name: { type: String },
    permissions: [String],
    tags: [String]
  },
  options: {
    collection: "user-groups"
  }
};