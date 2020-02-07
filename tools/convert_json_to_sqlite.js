const jsonList = require('../user_list.json');
const { Sequelize, Model, DataTypes } = require('sequelize');

let sequelize;

class User extends Model {}

async function connectToDB() {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '../database/gitslackin.sqlite',
  });

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
        // unique: true,
      },
      slack_id: {
        type: DataTypes.STRING,
        // unique: true,
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

  console.log('SYNC DB MODEL');
  const res = await User.sync({ force: true });
  console.log(res);
  console.log('Initializing DB...');
  return await sequelize.authenticate()
    .then(() => console.log('connected!'))
    .catch(err => { console.error('waaaat'); console.error(err); });
}

const dbUsers = [];

async function convertUser(user) {
  const dbUserParams = {
    name: user.name,
    requestable: user.requestable,
    merger: user.merger,
    review_action: user.review_action,
    notifications: user.notifications ? user.notifications : true,
  };
  if (user.github) {
    dbUserParams.github = user.github.toLowerCase();
  }
  if (user.slack && user.slack.id) {
    dbUserParams.slack_id = user.slack.id;
  }
  const newUser = await User.create(dbUserParams);
  console.log('New user created');
  console.log(newUser);
  return newUser;
}

function convert() {
  return Promise.all(jsonList.map(user => convertUser(user)));
}

(async() => {
  try {
    console.log('START CONNECT');
    await connectToDB();
    console.log('FINISH CONNECT');
  } catch (e) {
    console.error('CONNECT ERROR');
    throw e;
  }

  try {
    console.log('CONVERT');
    await convert();
  } catch (e) {
    console.error('ERROR');
    throw e;
  }

  console.log('ALL GOOD');
})().catch(e => {
  console.error('error');
  console.error(e);
});

