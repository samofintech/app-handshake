'use strict';

module.exports = {
  plugins: {
    appHandshake: {
      presetOTPs: [
        {
          enabled: true,
          phoneNumber: '+84987654321',
          otp: '1111'
        },
        {
          enabled: true,
          phoneNumber: '+84123456789',
          otp: '2222'
        },
      ]
    }
  }
};
