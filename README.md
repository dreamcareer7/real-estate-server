# Rechat API #

## How to install ##

Assuming you already have node.js, git and postgres:

```bash
git clone git@bitbucket.org:rechat/shortlisted-server.git
cd shortlisted-server
npm install .
psql shortlisted < lib/data/schema.sql
vim lib/config.js
```
And set configuration options of your database.

## Run the app ##

```bash
npm start
```

## Howto Test ##

```bash
npm test
```
