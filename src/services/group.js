'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function Group(params) {
  const { sandboxConfig, errorManager, dataManipulator, language = "en" } = params;

  this.createUserGroup = function(userGroups) {
    return dataManipulator.create({
      data: userGroups,
      type: 'UserGroupModel',
    }).catch(err => Promise.reject(err));
  };

  this.getPermission = function(groups) {
    if (!lodash.isEmpty(groups) && lodash.isArray(groups)) {
      return dataManipulator.find({
        type: "UserGroupModel",
        query: {
          "name": { "$in": groups }
        }
      }).then(userGroups => {
        return lodash.union(lodash.flatMap(userGroups, userGroup => userGroup.permissions));
      }).catch(err => {
        return Promise.reject(err);
      })
    }
  };
}

Group.referenceHash = {
  errorManager: "app-errorlist/manager",
  dataManipulator: "app-datastore/dataManipulator"
};

module.exports = Group;