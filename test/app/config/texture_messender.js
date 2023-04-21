const lodash = require('lodash');

module.exports = {
  plugins: {
    appHandshake: {
      services: {
        messender: {
          methods: {
            sendSMS: {
              mocking: {
                mappings: {
                  "unsupported": {
                    selector: function() {
                      return true;
                    },
                    generate: function(data = {}) {
                      console.log("SMS: %s", JSON.stringify(data));
                      return {
                        "code": "unsupported"
                      }
                    }
                  }
                }
              }
            },
            sendEmail: {
              mocking: {
                mappings: {
                  "unsupported": {
                    selector: function() {
                      return true;
                    },
                    generate: function() {
                      return {
                        "code": "unsupported"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
}