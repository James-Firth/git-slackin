const users = require('./user_list.json');

// Randomly select <numUsers> github users that are not <notMe>
async function selectRandomGithubUsersNot(notMe, numUsers = 1) {
  const usersToReturn = [];
  const excludedGithubNames = [notMe];

  while (usersToReturn.length < numUsers) {
    // Select a random user that is not the one we passed based on github name
    const otherUsers = users.filter(current => !excludedGithubNames.includes(current.github));
    if (otherUsers.length < 1) throw new Error('Not enough other users');

    const randomIndex = Math.floor(Math.random() * otherUsers.length);
    const selectedUser = otherUsers[randomIndex];
    usersToReturn.push(selectedUser);
    excludedGithubNames.push(selectedUser.github);
  }
  return usersToReturn;
}

// Look up a single user quickly
async function findByGithubName(name) {
  return users.find(element => element.github === name);
}

module.exports = {
  selectRandomGithubUsersNot,
  findByGithubName,
};
