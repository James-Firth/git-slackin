# Git Slackin'!

Get notified better when using Github Pull Requests and Slack.

Features and commands listed below

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

## Current Features

* Request reviews and send messages when opening a PR
  * Git-slackin will pick 2 random, requestable users from the `user_list.json`
  * Assigns them and requests a review from them on Github (_Note:_ These actions happen on the behalf of the user whose personal access token is in the config)
  * Notifies the requested reviewers via a DM with a link to the PR
  * Notifies the PR Opener who has been requested
  * If you add assignees to the PR before opening the number of randomly requested users will decrease
* Get notified when your PR is reviewd
  * Git-Slackin will message the opener of the PR informing them of who submitted a review, and in what state (approved, commented, requested changes)
* Don't bother people when then are not requestable

## Commands (via Slack DMs)

_Note_ All commands are case insensitive

### Everyone Commands

Get Command List
* Say `help`
* Lists the commands 

Bench Yourself
* Say `stop`, `silence`, or `mute`
* This means you will not be requested or messaged by Git Slackin'

Activate Notifications
* Say `start`, or `notify`

Am I requestable?
* Say `status`
* Get your github and slack usernames and your requestability status

### Admin/Manager commands

What's everyone's state?
* Say `overview`
* Lists benched and available users, like the boot message

Shut it all down
* Say `shutdown`
* Exits the git slackin' process.

