"use strict";

const lodash = require('lodash');

module.exports = {
  plugins: {
    appHandshake: {
      services: {
        handler: {
          methods: {
            login: {
              mocking: {
                mappings: {
                  "ok": {
                    selector: function(data = {}, opts = {}) {
                      return opts.mockSuite === 'ok';
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "0",
                        "data": {
                          "verificationId": "1234",
                          "expiredTime": 1295998
                        }
                      }
                    }
                  },
                  "unsupported": {
                    selector: function() {
                      return true;
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "unsupported"
                      }
                    }
                  }
                }
              }
            },
            verificationCode: {
              mocking: {
                mappings: {
                  "ok": {
                    selector: function(data = {}, opts = {}) {
                      return opts.mockSuite === 'ok';
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "0",
                        "data": {
                          "user": {
                            "userId": "eb86d671-59c4-460b-a395-08b204803684",
                            "firstName":"John",
                            "lastName":"Doe",
                            "gender":"male",
                            "avatar":"https://ui-avatars.com/api/?name=John+Doe",
                            "additionalInfo": {
                              "nationalId":"vi_VN",
                              "city":"Da Nang",
                              "district":"Hai Chau",
                            },
                            "active": true
                          },
                          "auth": {
                            "token_type": "Bearer",
                            "access_token": "d50d9fd00acf797ac409d5890fcc76669b727e63",
                            "refresh_token": "TZzj2yvtWlNP6BvG6UC5UKHXY2Ey6eEo80FSYax6Yv8",
                            "expires_in": 1295998
                          }
                        }
                      }
                    }
                  },
                  "failed": {
                    selector: function(data = {}, opts = {}) {
                      return opts.mockSuite === 'failed';
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "6",
                        "data": {
                          "verificationId": "1234",
                          "retryAttempts": 2,
                          "retryDelayMax": 15 * 60
                        }
                      }
                    }
                  },
                  "unsupported": {
                    selector: function() {
                      return true;
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "unsupported"
                      }
                    }
                  }
                }
              }
            },
            refreshToken: {
              mocking: {
                mappings: {
                  "ok": {
                    selector: function(data = {}, opts = {}) {
                      return opts.mockSuite === 'ok';
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "0",
                        "data": {
                          "auth": {
                            "token_type": "Bearer",
                            "access_token": "d50d9fd00acf797ac409d5890fcc76669b727e63",
                            "refresh_token": "TZzj2yvtWlNP6BvG6UC5UKHXY2Ey6eEo80FSYax6Yv8",
                            "expires_in": 1295998
                          }
                        }
                      }
                    }
                  },
                  "failed": {
                    selector: function(data = {}, opts = {}) {
                      return opts.mockSuite === 'failed';
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "7",
                        "message": "REFRESH_TOKEN_EXPIRED",
                        "tags": "relogin"
                      }
                    }
                  },
                  "unsupported": {
                    selector: function() {
                      return true;
                    },
                    generate: function(data = {}, opts = {}) {
                      return {
                        "code": "unsupported"
                      }
                    }
                  }
                }
              }
            }
          }
        },
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