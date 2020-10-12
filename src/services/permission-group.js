'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const APPTYPE_ADMIN = "adminApp";
const APPTYPE_AGENT = "agentApp";
const APPTYPE_CUSTOMER = "customerApp";
const APPTYPE_CLIENT = "clientApp";

function PermissionGroup(params) {
  const { errorManager, dataManipulator, language = "en" } = params;

  const packageName = params.packageName || "app-handshake";
  const config = lodash.get(params, ["sandboxConfig"], {});
  const errorBuilder = errorManager.register(packageName, {
    errorCodes: config.errorCodes
  });

  this.createPermissionGroup = function({name, permissions, appType}) {
    let appTypeConvert = sanitizeAppType(appType);

    if (!appTypeConvert) {
      return Promise.reject(errorBuilder.newError("MethodUnsupportedForAppType", {
        payload: {
          appType: appType,
          method: "createPermissionGroup"
        },
        language
      }));
    }
    return getOnePermissionGroupByNameAndAppType({name, appTypeConvert}).then(permissionGroup => {
        if (permissionGroup) {
          permissionGroup.permissions = permissions;
          return permissionGroup.save();
        } else {
          return dataManipulator.create({
            data: lodash.merge({name, permissions}, {"appType": sanitizeAppType(appTypeConvert)}),
            type: 'PermissionGroupModel',
          })
          .then(entity => entity)
        }
      })
      .catch(err => Promise.reject(err));
  };

  function getOnePermissionGroupByNameAndAppType({name, appTypeConvert}) {
    return dataManipulator.findOne({
      type: 'PermissionGroupModel',
      query: {
        "name": name,
        "appType": appTypeConvert
      }
    });
  }

  this.getPermissionByGroupNameAndAppType = function({groups, appType}) {
    if (!lodash.isEmpty(groups) && lodash.isArray(groups)) {
      return dataManipulator.find({
        type: "PermissionGroupModel",
        query: {
          "name": { "$in": groups },
          "appType": sanitizeAppType(appType)
        }
      }).then(permissionGroups => {
        return lodash.union(lodash.flatMap(permissionGroups, userGroup => userGroup.permissions));
      }).catch(err => {
        return Promise.reject(err);
      })
    }
  };
}

function sanitizeAppType (appType) {
  if (["adminApp", "admin", "cc", "operation"].indexOf(appType) >= 0) {
    return APPTYPE_ADMIN;
  } else if (["clientApp", "partyApp", "partnerApp", "client", "party", "partner"].indexOf(appType) >= 0) {
    return APPTYPE_CLIENT;
  } else if (["agentApp", "agent", "agent-app", "sales"].indexOf(appType) >= 0) {
    return APPTYPE_AGENT;
  }  else if (["customerApp", "customer", "customer-app"].indexOf(appType) >= 0) {
    return APPTYPE_CUSTOMER;
  }
  return null;
}

PermissionGroup.referenceHash = {
  errorManager: "app-errorlist/manager",
  dataManipulator: "app-datastore/dataManipulator"
};

module.exports = PermissionGroup;