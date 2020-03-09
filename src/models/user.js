'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // attributes
    name: {
      type: DataTypes.STRING,
      defaultValue: 'NoName',
    },
    requestable: {
      type: DataTypes.BOOLEAN,
    },
    github: {
      type: DataTypes.STRING,
      unique: true,
    },
    slack_id: {
      type: DataTypes.STRING,
      unique: true,
    },
    merger: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    review_action: {
      type: DataTypes.STRING,
      defaultValue: 'respond',
    },
    notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
