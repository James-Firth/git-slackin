// My Modules
const { selectRandomGithubUsersNot, findByGithubName } = require('./users');
const { send } = require('./messenger');

function buildOpenedPRMessage(opener, body) {
  const message = 'Hi! Please look at ' +
  `<${body.pull_request.html_url}|${body.pull_request.base.repo.name} PR #${body.number}> ` +
  `"${body.pull_request.title}" that ${opener.name} opened.`;
  return message;
}

function sendOpenedPrMessages(opener, users, body) {
  const messagesQueue = users.map(user => {
    console.log(`Send to ${user.name}`);
    const conversationId = user.slack.id;

    return send(conversationId, buildOpenedPRMessage(opener, body));
  });

  return Promise.all(messagesQueue);
}

async function informOpener(opener, reviewers) {
  const conversationId = opener.slack.id;
  const reviewersNames = reviewers.map(user => `<@${user.slack.id}>`);
  const message = `I have requested ${reviewersNames} to review your PR`;

  return send(conversationId, message);
}

// Handle everything we want to do about opening a PR.
// v1: randomly pick 2 users and send them links on Slack
async function openedPR(body) {
  try {
    // TODO: Have findByGithubName fail better if it can't find the person
    const opener = await findByGithubName(body.pull_request.user.login);
    const users = await selectRandomGithubUsersNot(opener.github, 2);

    // TODO: Handle it better if either fails
    const results = await Promise.all([
      sendOpenedPrMessages(opener, users, body),
      informOpener(opener, users),
    ]);
    console.log(`[PR Opened] Opener: ${opener.name} Reviewers Messaged: ${users.map(user => user.name)}`);
    return results;
  } catch (e) {
    console.log(`[PR Opened] Error: ${e}`);
    throw e;
  }
}

async function prReviewed(body) {
  let reviewer, coder;
  try {
    reviewer = await findByGithubName(body.review.user.login);
    coder = await findByGithubName(body.pull_request.user.login);
  } catch (e) {
    console.error(`[PR Reviewed] Error: ${e}`);
    throw e;
  }

  if (reviewer.slack.id === coder.slack.id) {
    const exitEarlyMsg = '[PR Reviewed] No need to notify for commenting on your own PR';
    console.log(exitEarlyMsg);
    return exitEarlyMsg;
  }
  if (!reviewer || !coder) throw new Error('Could not finder reviewer or coder');

  let emoji = ':speech_balloon:';
  const state = body.review.state.toLowerCase();
  if (state === 'approved') {
    emoji = ':heavy_check_mark:';
  } else if (state === 'changes_requested') {
    emoji = ':x:';
  }

  const message = `${emoji} ${reviewer.name} has reviewed your PR ` +
  `<${body.review.html_url}|${body.pull_request.base.repo.name} PR #${body.pull_request.number}>: ` +
  `\`${body.pull_request.title}\``;

  console.log(`[PR Reviewed] Reviewer: ${reviewer.name}. Repo: ${body.pull_request.base.repo.name}.` +
  `sending opener (${coder.name}, id ${coder.slack.id}) a message...`);

  try {
    return await send(coder.slack.id, message);
  } catch (e) {
    console.error(`[PR Reviewed] Error: ${e}`);
    throw new Error(e);
  }
}

// very simple router based on the action that occurred.
function routeIt(body, headers) {
  if (!body.action) throw new Error('no Action');
  console.log(`[RouteIt] ${body.action} on ${body.pull_request.base.repo.name}`);

  if (body.action === 'opened') return openedPR(body);
  if (body.action === 'submitted') return prReviewed(body);

  console.log(`[RouteIt] No handler for: ${body.action} on ${body.pull_request.base.repo.name}`);
  return Promise.reject('Unhandled action type');
}
module.exports = {
  handle: routeIt,
};
