const jsonList = require('./git-slackin/user_list.json');
const Sequelize = require('sequelize');
const Model = Sequelize.Model;

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database/..itslackin.sqlite',
});

console.log('Initializing DB...');
sequelize.authenticate()
  .then(() => console.log('connected!'))
  .catch(err => console.error(err));

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

const dbUsers = [];
async function doDBStuff() {
  for (const user in jsonList) {
    const dbUserParams = {
      name: user.name,
      github: user.github.toLowerCase(),
      requestable: user.requestable,
      merger: user.merger,
      review_action: user.review_action,
      notifications: user.notifications,
    };
    const newUser = await User.create(dbUserParams);
    dbUsers.push(newUser);
  }
  console.log('sync all new models...');
  await sequelize.sync();
  console.log('sync complete!');
}

console.log('starting db stuff');
doDBStuff();
console.log('finish db stuff');
