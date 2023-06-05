"use strict";

/**
 * Generate password from allowed word
 */
const DIGITS = "0123456789";
const ALPHABETS = "abcdefghijklmnopqrstuvwxyz";
const UPPER_CASES = ALPHABETS.toUpperCase();
const SPECIAL_CHARS = "#!&@";
module.exports = {
  /**
   * Generate OTP of the length
   * @param  {number} length length of password.
   * @param  {object} options
   * @param  {boolean} options.digits Default: `true` true value includes digits in OTP
   * @param  {boolean} options.alphabets Default: `true` true value includes alphabets in OTP
   * @param  {boolean} options.upperCase Default: `true` true value includes upperCase in OTP
   * @param  {boolean} options.specialChars Default: `true` true value includes specialChars in OTP
   */
  generate: function (length, options) {
    length = length || 10;
    const generateOptions = options || {};
    generateOptions.digits = generateOptions.hasOwnProperty("digits") ? options.digits : true;
    generateOptions.alphabets = generateOptions.hasOwnProperty("alphabets") ? options.alphabets : true;
    generateOptions.upperCase = generateOptions.hasOwnProperty("upperCase") ? options.upperCase : true;
    generateOptions.specialChars = generateOptions.hasOwnProperty("specialChars") ? options.specialChars : true;
    const allowsChars = ((generateOptions.digits || "") && DIGITS) + ((generateOptions.alphabets || "") && ALPHABETS) + ((generateOptions.upperCase || "") && UPPER_CASES) + ((generateOptions.specialChars || "") && SPECIAL_CHARS);
    let password = "";
    for (let index = 0; index < length; ++index) {
      let charIndex = rand(0, allowsChars.length - 1);
      password += allowsChars[charIndex];
    }
    return password;
  }
};
function rand(min, max) {
  const random = Math.random();
  return Math.floor(random * (max - min) + min);
}