const { User, sequelize } = require('../models');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const logger = require('../logger');

// Register new users with some sane defaults
async function createUser(
  name, slackInfo, githubUsername,
  { requestable = true, merger = false, review_action = 'respond', notifications = true } = {}
) {
  const params = {
    name,
    slack_id: slackInfo.id,
    requestable,
    merger,
    review_action,
    notifications,
  };
  if (githubUsername) {
    params.github = githubUsername.toLowerCase();
  }

  const newUser = await User.create(params);

  logger.info(`[USERS] New User created: ${JSON.stringify(newUser)}`);
  return newUser;
}

// Randomly select <numUsers> github users that are not <notMe>
async function selectRandomGithubUsersNot(notMe, numUsers = 1) {
  return await User.findAll({
    order: sequelize.random(),
    where: {
      id: {
        [Op.notIn]: notMe,
      },
    },
    limit: numUsers,
  });
}

// Look up a single user quickly or return null for easy comparisons
async function findByGithubName(name, logId) {
  if (!name) {
    logger.warn(`[users.findByGithubName:${logId}] Must pass name`);
    return null;
  }
  return await User.findOne({
    where: {
      github: name.toLowerCase(),
    },
  });
}

// Look up a single user quickly or return null for easy comparisons
async function findBySlackUserId(slackId, logId) {
  if (!slackId) {
    logger.warn(`[users.findBySlackUserId:${logId}] Must pass slack id`);
    return null;
  }
  return await User.findOne({
    where: {
      slack_id: slackId,
    },
  });
}

async function listBenchedUsers(onlyNames = false) {
  const benchedUsers = await User.findAll({
    where: {
      requestable: false,
    },
  });
  if (onlyNames) return benchedUsers.map(user => user.name);
  return benchedUsers;
}

async function listAvailableUsers(onlyNames = false) {
  const availableUsers = await User.findAll({
    where: {
      requestable: true,
    },
  });
  if (onlyNames) return availableUsers.map(user => user.name);
  return availableUsers;
}

async function listAllUsers() {
  return await User.findAll();
}

// async function filterUsers({ prop, val }) {
//   return users.filter(user => user[prop] && user[prop] === val);
// }

async function fetchMergers() {
  logger.info('[users.fetchMergers] Fetching mergers');
  return await User.fetchAll({
    where: {
      merger: true,
    },
  });
}

async function benchUserBySlackId(id, logId) {
  if (!id) return logger.info(`[users.benchUserBySlackId:${logId}] id required to bench user.`);

  const updatedUser = await User.update({
    requestable: false,
  },
  {
    where: {
      slack_id: id,
    },
  });

  if (updatedUser.length > 0) {
    logger.info(`[users.benchUserBySlackId:${logId}] Benched user: ${id}. user_list file`);
  } else {
    logger.info(`[users.benchUserBySlackId:${logId}] Could not find user ${id} to bench.`);
  }
  return updatedUser;
}


async function activateUserBySlackId(id, logId) {
  if (!id) return logger.info(`[users.activateUserBySlackId:${logId}] id required to activate user.`);

  const updatedUser = await User.update({
    requestable: true,
  },
  {
    where: {
      slack_id: id,
    },
  });

  if (updatedUser.length > 0) {
    logger.info(`[users.activateUserBySlackId:${logId}] Benched user: ${id}. user_list file`);
  } else {
    logger.info(`[users.activateUserBySlackId:${logId}] Could not find user ${id} to bench.`);
  }
  return updatedUser;
}

async function muteNotificationsBySlackId(id, logId) {
  if (!id) return logger.info(`[users.muteNotificationsBySlackId:${logId}] id required to mute notifications.`);

  const updatedUser = await User.update({
    notifications: false,
  },
  {
    where: {
      slack_id: id,
    },
  });

  if (updatedUser.length > 0) {
    logger.info(`[users.muteNotificationsBySlackId:${logId}] Muted user: ${id}`);
  } else {
    logger.info(`[users.muteNotificationsBySlackId:${logId}] Could not find user ${id} to mute.`);
  }

  return updatedUser;
}

async function unmuteNotificationsBySlackId(id, logId) {
  if (!id) return logger.info(`[users.unmuteNotificationsBySlackId:${logId}] id needed to unmute notifications.`);

  const updatedUser = await User.update({
    notifications: false,
  },
  {
    where: {
      slack_id: id,
    },
  });

  if (updatedUser.length > 0) {
    logger.info(`[users.unmuteNotificationsBySlackId:${logId}] Unmuted user: ${id}`);
  } else {
    logger.info(`[users.unmuteNotificationsBySlackId:${logId}] Could not find user ${id} to unmute.`);
  }

  return updatedUser;
}

async function listAllUserNamesByAvailability() {
  const availableUsers = await listAvailableUsers(true);
  const benchedUsers = await listBenchedUsers(true);

  let availableUsersString = availableUsers.join();
  let benchedUsersString = benchedUsers.join();
  if (availableUsersString.length === 0) availableUsersString = 'None';
  if (benchedUsersString.length === 0) benchedUsersString = 'None';

  return {
    available: availableUsersString,
    benched: benchedUsersString,
  };
}

module.exports = {
  createUser,
  selectRandomGithubUsersNot,
  findByGithubName,
  findBySlackUserId,
  fetchMergers,
  listAllUsers,
  listAllUserNamesByAvailability,
  listBenchedUsers,
  listAvailableUsers,
  benchUserBySlackId,
  activateUserBySlackId,
  muteNotificationsBySlackId,
  unmuteNotificationsBySlackId,
};
