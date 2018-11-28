const { WebClient } = require('@slack/client');
const config = require('config');

// Setup Slack web client
const token = config.get('slack');
const web = new WebClient(token);

// Actually send a message
function sendMessage(conversationId, message) {
  if (typeof process.env.DEBUG === 'string') {
    console.log(`[DEBUG] conversationId: ${conversationId}, Message: ${message}`);
  }
  if (typeof message !== 'string' || !message.trim()) throw new Error('Message must be a non-zero length string.');
  if (typeof conversationId !== 'string' || !conversationId.trim()) {
    throw new Error('Message must be a non-zero length string.');
  }

  const params = {
    channel: conversationId,
    text: message };

  if (typeof process.env.DEBUG === 'string') {
    console.log(`[DEBUG] Message: ${JSON.stringify(params, null, 2)}`);
  }

  // See: https://api.slack.com/methods/chat.postMessage
  return web.chat.postMessage(params)
    .then((res) => {
      console.log(`[Messenger] Sent to ${conversationId}. Timestamp: ${res.ts}`);
      return res;
    })
    .catch(e => {
      console.error(e);
      throw e;
    });
}

// TODO: Should be smarter and check if it's open first?
function openDM(userId) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('Must provider userId');
  return web.conversations.open({ users: userId })
    .then(res => {
      if (res.ok) {
        return res.channel.id;
      } else {
        throw new Error(res.error);
      }
    });
}

// have to find the DM channel ID, then send a message on that channel.
// just using the user ID sends the message via @slackbot instead.
function sendDM(userId, message) {
  return openDM(userId)
    .then(dmChannelId => {
      return sendMessage(dmChannelId, message);
    });
}


module.exports = {
  send: sendDM,
};
