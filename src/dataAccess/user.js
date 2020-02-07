const { DataTypes, Model } = require('sequelize');
const sequelize = require('./db_connection');

class User extends Model {}
User
  .init({
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
  },
  {
    sequelize,
    modelName: 'User',
    // options
  });

User.sync({ force: true });

module.exports = User;
