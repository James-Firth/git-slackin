const Sequelize = require('sequelize');
const config = require('config');
// const user = require('./user');

let client;

function getDbConnection() {
  if (!client) {
    client = new Sequelize({
      dialect: 'sqlite',
      storage: config.get('database_path'),
    });

    console.log('Initializing DB...');
    client
      .authenticate()
      .then(() => {
        console.log('Connection has been established successfully.');
      })
      .catch(err => {
        console.error('Unable to connect to the database:', err);
      });
  }

  return client;
}

getDbConnection();

module.exports = getDbConnection();
