"use strict";

const devebot = require("devebot");
const lodash = devebot.require("lodash");
require("should");

const app = require("../app");

async function getService (app, serviceName) {
  const injektor = await app.runner.invoke(lodash.identity);
  const sandboxManager = injektor.lookup("sandboxManager");
  return sandboxManager.getSandboxService(serviceName);
}

describe("services:pwd-ruler", function() {
  describe("isValid", function() {
    let isValid;

    beforeEach(async function() {
      isValid = await getService(app, "pwdRuler").then(
        (pwdRuler) => pwdRuler.isValid
      );
    });

    it("minimum length 5", function() {
      isValid("Qty!0").should.equal(true);
      isValid("Qy!0").should.equal(false);
    });

    it("maximum length 100", function() {
      isValid("Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0qwer").should.equal(true);
      isValid("Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0Qwerty!0qwert").should.equal(false);
    });

    it("must have at least 1 digits", function() {
      isValid("Qty!a").should.equal(false);
      isValid("Qty!0").should.equal(true);
    });

    it("must have at least 1 uppercase letter", function() {
      isValid("qty!0").should.equal(false);
      isValid("Qty!0").should.equal(true);
    });

    it("must have at least 1 lowercase letter", function() {
      isValid("QTY!0").should.equal(false);
      isValid("QTy!0").should.equal(true);
    });

    it("must have at least 1 symbol", function() {
      isValid("Qty00").should.equal(false);
      isValid("Qty!0").should.equal(true);
    });

    it("should not have spaces", function() {
      isValid("Qt y !0").should.equal(false);
      isValid(" Qty!0").should.equal(false);
      isValid("Qty!0 ").should.equal(false);
    });
  });
});
