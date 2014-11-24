# Shortlisted backend #

## How to install ##

Assuming you already have nodejs, git and postgres:

```bash
git clone git@bitbucket.org:shayanhamidi/shortlisted-server.git
cd shortlisted-server
npm install .
psql shortlisted < lib/data/schema.sql
vim lib/config.js
```
And set configuration option of your database.

## Howto Test ##
```bash
npm test
```