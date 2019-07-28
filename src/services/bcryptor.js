'use strict';

const lodash = Devebot.require('lodash');
const bcryptjs = require('bcryptjs');

function Bcryptor ({ sandboxConfig }) {
  const bcrypt = useNative(bcryptjs);
  const saltRounds = lodash.get(sandboxConfig, ['saltRounds'], 7);

  this.hash = function(plaintextPasswd) {
    return bcrypt.hash(plaintextPasswd, saltRounds);
  }
}

module.exports = Bcryptor;

function useNative(bcrypt) {
  try {
    bcrypt = require('bcrypt');
  } catch (err) {
    // native bcrypt not found
  }
  return bcrypt;
}
