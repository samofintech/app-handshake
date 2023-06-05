"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");
const bcryptjs = require("bcryptjs");
function Bcryptor({
  sandboxConfig
}) {
  const bcrypt = useNative(bcryptjs);
  const saltRounds = lodash.get(sandboxConfig, ["saltRounds"], 7);
  this.hash = function (password) {
    return bcrypt.hash(password, saltRounds);
  };
  this.hashSync = function (password) {
    return bcrypt.hashSync(password, saltRounds);
  };
  this.compare = function (password, hashPassword) {
    return bcrypt.compare(password, hashPassword);
  };
  this.compareSync = function (password, hashPassword) {
    return bcrypt.compareSync(password, hashPassword);
  };
}
module.exports = Bcryptor;
function useNative(bcrypt) {
  try {
    /* eslint-disable node/no-missing-require */
    bcrypt = require("bcrypt");
  } catch (err) {
    // native bcrypt not found
  }
  return bcrypt;
}