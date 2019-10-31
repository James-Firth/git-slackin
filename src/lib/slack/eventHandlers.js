const logger = require('../../logger');
const config = require('config');
const common = require('./common');
const crypto = require('crypto');
const { sendToChannel, sendEphemeralMessage, send } = require('./message');
const { benchUserBySlackId, activateUserBySlackId, findByGithubName, findBySlackUserId,
  muteNotificationsBySlackId, unmuteNotificationsBySlackId, createUser } = require('../users');
const appRoot = require('app-root-path');
const fs = require('fs');
const configFile = `${appRoot}/config/development.json`;
const configuration = require(configFile);
const simpleGit = require('simple-git/promise')(appRoot.path);

function challenge(req, res, next) {
  logger.info(`Slack Challenge: ${JSON.stringify(req.body)}`);
  return res.status(200).type('text/plain').send(req.body.challenge);
}


async function updateConfigurations(configOverrides) {
  const mergedConfigs = Object.assign(configuration, configOverrides);
  return fs.writeFileSync(configFile, JSON.stringify(mergedConfigs, null, 2), 'utf-8');
}

// TODO: Fix this error
//Git#then is deprecated after version 1.72 and will be removed in version 2.x
//Please switch to using Git#exec to run arbitrary functions as part of the command chain.

// maybe I should just fetch and checkout the branch instead of pulling I think this would allow for better updates
// especially if changing branches.
async function updateGitSlackin(theEvent, branch = 'master') {
  let updateResult = null;
  try {
    // Let's discard these changes first.
    await simpleGit.stash();
    await simpleGit.stash(['drop']);

    // Now let's grab the latest and always take the origin's changes
    // Rebase to avoid extra commits. Thanks Oh-my-zsh for the inspiration!
    updateResult = await simpleGit.pull('origin', branch, { '--rebase': 'true' });
  } catch (e) {
    return sendEphemeralMessage(theEvent.challenge, theEvent.user.slack, `Update failed. Error: ${e}`);
  }

  const triggeringUser = await findBySlackUserId(theEvent.user);
  return sendToChannel(theEvent.channel, `Update trigger by ${triggeringUser.name}. Be back shortly! :wave:\n` +
  `Changes: ${updateResult}`)
    .then(() => {
      // this works since we've already pulled so restarting should work.
      return process.exit(0);
    });
}

async function handleAdminCommands(command, theEvent, res) {
  if (!config.has('slack_manager_ids')
    || !config.get('slack_manager_ids').includes(theEvent.user)) {
    return sendEphemeralMessage(theEvent.channel, theEvent.user, 'This command is Admin-only or does not exist.');
  }

  if (/^echo/.test(command)) {
    logger.info('[Admin] echo requested');
    return sendToChannel(theEvent.channel, `\`\`\`${command}\n${JSON.stringify(theEvent)}\`\`\``);
  }

  if (/^config$/.test(command)) {
    return sendEphemeralMessage(theEvent.channel, theEvent.user, JSON.stringify(configuration));
  }

  const setConfigRegexResult = /^config set (.+)$/.exec(command);
  if (setConfigRegexResult && setConfigRegexResult.length > 1) {
    try {
      const newConfig = JSON.parse(setConfigRegexResult[1]);
      await updateConfigurations(newConfig);
      return await sendToChannel(theEvent.channel, 'Updated config, restarting Git Slackin...')
        .then(() => {
          return process.exit(0);
        });
    } catch (e) {
      return sendEphemeralMessage(theEvent.channel, theEvent.user, 'Error updating configuration');
    }
  }

  if (command === 'overview') {
    logger.info(`[DM Event] ${theEvent.user} requested all users status`);
    return common.generateAndSendBootMessage(theEvent.channel);
  }

  if (/^bench/.test(command)) {
    const slackUserIdToBench = common.findUserMention(command);
    await benchUserBySlackId(slackUserIdToBench);

    send(slackUserIdToBench, `You have been benched by <@${theEvent.user}>. ` +
    'Send me, Git Slackin, `start` to start receiving Review Requests again.');

    return await sendEphemeralMessage(theEvent.channel, theEvent.user,
      `I have benched <@${slackUserIdToBench}> as requested.`);
  }

  if (/^unbench/.test(command)) {
    const slackUserIdToUnbench = common.findUserMention(command);
    await activateUserBySlackId(slackUserIdToUnbench);

    send(slackUserIdToUnbench, `You have been unbenched by <@${theEvent.user}>. ` +
    'Send me, Git Slackin, `start` to start receiving Review Requests again.');

    return sendEphemeralMessage(theEvent.channel, theEvent.user,
      `I have unbenched <@${slackUserIdToUnbench}> as requested.`);
  }

  // This looks for update either by itself or followed by a space then another word (the branch name)
  const updateRegexResult = /^update(?:\s(\w+))?$/.exec(command);
  if (updateRegexResult && updateRegexResult.length > 1) {
    const branch = updateRegexResult[1]; // will be undefined if not found and that's fine
    logger.info(`[DM Event] ${theEvent.user} is updating to the latest version`);
    return await updateGitSlackin(theEvent, branch);
  }

  if (command === 'shutdown') {
    logger.info(`[ADMIN Event] ${theEvent.user} requested shutdown`);
    return sendToChannel(theEvent.channel, 'Shutting down!')
      .then(() => {
        return process.exit(0);
      });
  }
}

async function handleCommands(text, theEvent, res) {
  const smallText = text.toLowerCase();

  if (/^register/.test(smallText)) {
    logger.info(`[DM Event] Registration Begin: ${theEvent.user}`);
    const registerRegexResult = /^register(?:\s(.+))?$/.exec(smallText);
    const githubUserRegex = /http[s]*:\/\/github.com\/([a-zA-Z-]+)\//g;

    if (registerRegexResult && registerRegexResult.length === 2) {
      const githubRegexResults = githubUserRegex.exec(registerRegexResult[1]);

      // Grab the username, either from the URL or directly
      let githubUserName = registerRegexResult[1];
      if (githubRegexResults && githubRegexResults.length === 2) {
        githubUserName = githubRegexResults[1];
      }

      const preexistingUser = await findByGithubName(githubUserName);

      if (preexistingUser !== null) {
        const preexistingUserSlackName = preexistingUser.slack ? preexistingUser.slack.name : 'SOMEONE';
        logger.error(`[DM Event] Cannot register twice! ${preexistingUser.github} ` +
          `is already registered to ${preexistingUserSlackName}`);
        return sendToChannel(theEvent.channel, 'Registration failed.' +
          ' That github username is already registered to someone else. (Weird!)');
      }

      // TODO: look up more info about slack user when I update from slack sdk v4 to v5
      // Change first param to name based on looked up slack info
      return await createUser(githubUserName, { name: githubUserName, id: theEvent.user }, githubUserName) // TODO: Grab all needed info
        .then(() => {
          return sendToChannel(theEvent.channel, 'You are now registered, now git slackin\'!');
        });
    } else {
      logger.error('[DM Event] Registration Failed: no username specified.');
      return sendToChannel(theEvent.channel, 'Registration failed, github username not specified.');
    }
  }

  if (smallText === 'ping') {
    logger.info(`[DM Event] ${theEvent.user} is playing ping-pong`);
    return sendToChannel(theEvent.channel, 'pong :table_tennis_paddle_and_ball:');
  }

  if (smallText === 'marco') {
    logger.info(`[DM Event] ${theEvent.user} is looking for Marco`);
    return sendToChannel(theEvent.channel, 'Polo! :water_polo:');
  }

  if (smallText === 'hello' || smallText === 'hi') {
    logger.info(`[DM Event] ${theEvent.user} is trying to converse with a robot.`);
    return sendEphemeralMessage(theEvent.channel, theEvent.user,
      'Hey.');
  }

  if (smallText === 'stop') {
    logger.info(`[DM Event] ${theEvent.user} benched themselves.`);
    benchUserBySlackId(theEvent.user);
    return sendEphemeralMessage(theEvent.channel, theEvent.user,
      'You are now benched and are unrequestable :no:');
  }

  if (smallText === 'silence' || smallText === 'mute') {
    logger.info(`[DM Event] ${theEvent.user} turned off notifications`);
    muteNotificationsBySlackId(theEvent.user);
    return sendEphemeralMessage(theEvent.channel, theEvent.user,
      'Your Git Slackin notifications are now muted :no_bell:');
  }

  if (smallText === 'notify' || smallText === 'unmute') {
    logger.info(`[DM Event] ${theEvent.user} turned on notifications`);
    unmuteNotificationsBySlackId(theEvent.user);
    return sendEphemeralMessage(theEvent.channel, theEvent.user,
      'Your Git Slackin notifications are now unmuted :bell:');
  }

  if (smallText === 'start') {
    logger.info(`[DM Event] ${theEvent.user} activated themselves.`);
    activateUserBySlackId(theEvent.user);
    return sendEphemeralMessage(theEvent.channel, theEvent.user, 'You are now Requestable :yes:');
  }
  if (smallText === 'status') {
    const user = await findBySlackUserId(theEvent.user);
    logger.info(`[DM Event] ${theEvent.user} requested their status.`);
    return sendEphemeralMessage(theEvent.channel, theEvent.user, `You are <@${user.slack.id}> here and ` +
    `<https://github.com/${user.github}|@${user.github}> on GitHub.\n` +
    `Your current Git Slackin' status is: ${user.requestable ? 'Requestable :yes:' : 'UnRequestable :no:'}.\n` +
    `Your current Git Slackin' notification mode is: ${user.notifications ? 'On :bell:' : 'Off :no_bell:'}`);
  }

  if (smallText === 'help') {
    return sendEphemeralMessage(theEvent.channel, theEvent.user, 'Here are my available commands:\n\n' +
    '`stop` or `silence` or `mute` -- No longer get requested for reviews. ' +
    'No longer get notifications when your PR is reviewed\n' +
    '`start` or `notify` -- Become requestable again\n' +
    '`status` -- get your current status/info that git slackin has about you');
  }

  // Looks for PR form
  const prplsRegex = new RegExp('^(prpls) (<https://github.com/\\w+/([\\w])+/pull/(\\d)+>)', 'i');
  if (prplsRegex.test(smallText)) {
    return sendEphemeralMessage(theEvent.channel, theEvent.user, 'Sorry, I cannot currently add more reviewers');
  }

  return handleAdminCommands(smallText, theEvent, res);
}

async function handleDM(theEvent, res) {
  return await handleCommands(theEvent.text, theEvent, res);
}

function verify(headers, body) {
  const timestamp = headers['x-slack-request-timestamp'];
  const providedSignature = headers['x-slack-signature'];
  const secret = config.get('slack_signing_secret');
  const now = Date.now() / 1000;
  if (Math.abs(now - timestamp) > (60 * 5)) {
    logger.warn(`[Verify] ${timestamp} is much older than 5 minutes (now: ${now} disallow message.)`);
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${body}`;
  const hmacComputer = crypto.createHmac('sha256', secret);
  hmacComputer.update(sigBaseString);
  const calculatedSignature = `v0=${hmacComputer.digest('hex')}`;

  logger.debug(`Signature:\n${calculatedSignature}\n${providedSignature}`);
  return crypto.timingSafeEqual(Buffer.from(calculatedSignature, 'utf8'), Buffer.from(providedSignature, 'utf8'));
}

function route(req, res, next) {
  if (!verify(req.headers, JSON.stringify(req.body))) return res.sendStatus(400);
  if (req.body.type === 'url_verification') return challenge(req, res, next);

  if (!req.body.event) {
    logger.error('Body missing event!');
    return res.sendStatus(200);
  }
  res.sendStatus(200);


  // logger.verbose(`[Slack Action] Received event: ${JSON.stringify(req.body, null, 2)}. Params: ${req.params}`);
  if (req.body.event.type === 'message' && req.body.event.subtype === 'bot_message') {
    return logger.debug('Bots should not talk together');
  }

  if (req.body.event.type === 'message' && !req.body.event.subtype && req.body.event.channel_type === 'im') {
    console.log(req.body.event);
    return handleDM(req.body.event, res);
  } else if (req.body.event.type === 'message') {
    return logger.warn(`[Message] [Unhandled] Subtype: '${req.body.event.subtype}' Channel type: '${req.body.event.channel_type}'`);
  }

  if (req.body.event.type === 'app_mention') {
    const mentions = /^<@\w+> (.+)$/g;
    const matches = mentions.exec(req.body.event.text);
    if (matches && matches.length >= 2) {
      return handleCommands(matches[1], req.body.event, res);
    } else {
      logger.warn('App_mention did not split nicely');
    }
  }

  logger.warn(`Event ${req.body.event.type} not handled`);
}

module.exports = {
  route,
};
