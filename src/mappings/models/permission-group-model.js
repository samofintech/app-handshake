"use strict";
/**
 *
 * Permission Group Model
 */
module.exports = {
  name: "PermissionGroupModel",
  descriptor: {
    name: { type: String },
    permissions: [String],
    appType: { type: String },
    activated: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    tags: [String],
  },
  options: {
    collection: "permission-groups"
  }
};
