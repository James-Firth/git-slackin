# Git Slackin'!

Get notified better when using Github Pull Requests and Slack.

## Current Features

* When opening a PR, git-slackin will notify 2 random users in your user list to look at the PR
* When a PR you opened receives a review,  you'll get a slack message
* When a PR you commented on updates, you'll get a slack message

## Setup

* Clone the repo
* Install dependencies `npm i`
* Create a config file
  * Name it `development.json`
  * Base it off of `config/example.json`
* Create a `user_list.json` with all the users you want involved
  * Base it off of `example_user_list.json`
  * _Note:_ future goal is for this to live in a DB and for users to sign themselves up
* Run service `npm start`
  * If running on a local machine use `ngrok` to make endpoint available to the internet
* Create a [Webhook](https://developer.github.com/webhooks/creating/) for your repo
  * Please include all Pull Request related events (not all used yet)
* Start making Pull Requests!
