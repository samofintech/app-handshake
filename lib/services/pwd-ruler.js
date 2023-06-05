"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");
const PasswordValidator = require('password-validator');
const schema = new PasswordValidator();
function PwdRuler(params = {}) {
  const config = lodash.get(params, ["sandboxConfig"], {});
  const pwdRuleConfig = lodash.get(config, "pwdRules");
  const translate = {
    is: "is",
    has: "has",
    max: "max",
    min: "min",
    not: "not",
    symbols: "symbols",
    letters: "letters",
    uppercase: "uppercase",
    lowercase: "lowercase",
    digits: "digits",
    spaces: "spaces",
    included: "oneOf",
    turnOn: "turnOn"
  };
  const PwdValidator = _buildValidator(pwdRuleConfig);
  this.isValid = function (password) {
    return PwdValidator.validate(password);
  };
  function _transform(configs, parent) {
    Object.keys(configs).forEach(keyCheck => {
      const settingValue = lodash.get(configs, keyCheck);
      const keyCheckTranslate = lodash.get(translate, keyCheck);
      if (keyCheckTranslate) {
        if (keyCheckTranslate === "turnOn" && Array.isArray(settingValue)) {
          settingValue.forEach(turnOnKeyCheck => {
            parent[lodash.get(translate, turnOnKeyCheck)]();
          });
        } else if (settingValue && !Array.isArray(settingValue) && typeof settingValue === "object") {
          _transform(settingValue, parent[keyCheckTranslate]());
        } else {
          parent[keyCheckTranslate](settingValue);
        }
      }
    });
  }
  function _buildValidator(configs, dictionary = []) {
    // Transform Configs
    const _configs = configs || {
      is: {
        min: 8,
        max: 100
      },
      has: {
        digits: 1,
        uppercase: 1,
        lowercase: 1,
        symbols: 1,
        not: {
          spaces: 0
        }
      }
    };
    _transform(_configs, schema);
    return schema;
  }
}
module.exports = PwdRuler;