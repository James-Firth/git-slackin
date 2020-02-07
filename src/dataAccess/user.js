const Sequelize = require('sequelize');
const Model = Sequelize.Model;
const sequelize = require('./db_connection');

class User extends Model {}
User
  .init({
    // attributes
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    requestable: {
      type: Sequelize.BOOLEAN,
    },
    github: {
      type: Sequelize.STRING,
      unique: true,
    },
    slack_id: {
      type: Sequelize.STRING,
      unique: true,
    },
    merger: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    review_action: {
      type: Sequelize.STRING,
      defaultValue: 'respond',
    },
    notifcations: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'user',
    // options
  });

User.sync({ force: true });

module.exports = User;
