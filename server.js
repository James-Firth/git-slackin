const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
// My modules
const handlers = require('./handlers');

app.use(bodyParser.json());

// Basic web server to handle payloads
app.post('/payload', (req, res) => {
  if (req.headers['x-github-event'] === 'pull_request' ||
  req.headers['x-github-event'] === 'pull_request_review') {
    return handlers.handle(req.body, req.header)
      .then(() => res.sendStatus(200))
      .catch(() => res.sendStatus(500));
  } else if (req.headers['x-github-event'] === 'ping') {
    return res.status(200).send('pong');
  } else {
    console.log('Invalid request!');
    res.sendStatus(500);
  }
});

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log(`server is listening on ${port}`);
});
