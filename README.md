# Rechat API #

## How to install ##

Assuming you already have node.js, git and postgres:

```bash
git clone git@bitbucket.org:rechat/server.git
cd shortlisted-server
npm install .
psql rechat < lib/data/schema.sql
vim lib/config.js
```
And set configuration options of your database.

## Run the app ##

```bash
npm start
```
port 3078

## Howto Test ##

```bash
npm test
```