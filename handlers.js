const { WebClient } = require('@slack/client');
const config = require('config');

// My Modules
const { selectRandomGithubUsersNot, findByGithubName } = require('./users');

// Setup Slack web client
const token = config.get('slack');
const web = new WebClient(token);

function buildOpenedPRMessage(opener, body) {
  const message = 'Hi! Please look at ' +
  `<${body.pull_request.html_url}|${body.pull_request.base.repo.name} PR #${body.number}> ` +
  `"${body.pull_request.title}" that ${opener.name} opened.`;
  return message;
}

function sendOpenedPrMessages(opener, users, body) {
  const messagesQueue = users.map(user => {
    console.log(`sending to ${user.name}`);
    const conversationId = user.slack.id;

    // See: https://api.slack.com/methods/chat.postMessage
    return web.chat.postMessage({ channel: conversationId, text: buildOpenedPRMessage(opener, body) })
      .then((res) => {
        console.log(`message sent at: ${res.ts}`);
      })
      .catch(console.error);
  });

  return Promise.all(messagesQueue);
}

// Handle everything we want to do about opening a PR.
// v1: randomly pick 2 users and send them links on Slack
async function openedPR(body) {
  const opener = await findByGithubName(body.pull_request.user.login);
  const users = await selectRandomGithubUsersNot(opener.github, 2);
  return Promise.all([
    sendOpenedPrMessages(opener, users, body),
  ]);
}

async function prReviewed(body) {
  const reviewer = await findByGithubName(body.review.user.login);
  const coder = await findByGithubName(body.pull_request.user.login);
  let emoji = ':speech_balloon:';
  const state = body.review.state.toLowerCase();
  if (state === 'approved') {
    emoji = ':heavy_check_mark:';
  } else if (state === 'changes_requested') {
    emoji = ':x:';
  }

  const message = `${emoji} ${reviewer.name} as reviewed your PR ` +
  `<${body.review.html_url}|${body.pull_request.base.repo.name} PR #${body.pull_request.number}>: ` +
  `\`${body.pull_request.title}\``;

  return web.chat.postMessage({ channel: coder.slack.id, text: message })
    .then((res) => {
      console.log(`message sent at: ${res.ts}`);
    })
    .catch(console.error);
}

// very simple router based on the action that occurred.
function routeIt(body, headers) {
  if (!body.action) throw new Error('no Action');

  if (body.action === 'opened') return openedPR(body);
  if (body.action === 'submitted') return prReviewed(body);

  console.log('Not suitable handler at the moment');
  return Promise.resolve('No Suitable handler at moment');
}
module.exports = {
  handle: routeIt,
};
