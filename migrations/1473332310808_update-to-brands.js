'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE brands_hostnames ( id uuid NOT NULL DEFAULT uuid_generate_v1(), brand uuid NOT NULL REFERENCES brands(id), hostname TEXT, "default" BOOLEAN  NOT NULL DEFAULT FALSE)',
  'CREATE TABLE brands_offices ( id uuid NOT NULL DEFAULT uuid_generate_v1(), brand uuid NOT NULL REFERENCES brands(id), office uuid NOT NULL REFERENCES offices (id) )',
  'CREATE TABLE brands_agents ( id uuid NOT NULL DEFAULT uuid_generate_v1(), brand uuid NOT NULL REFERENCES brands(id), agent uuid NOT NULL REFERENCES agents (id) )',
  'CREATE TABLE brands_users ( id uuid NOT NULL DEFAULT uuid_generate_v1(),brand uuid NOT NULL REFERENCES brands(id), "user" uuid NOT NULL REFERENCES users(id),role TEXT)',

  'ALTER TABLE brands DROP subdomain',

  'ALTER TABLE brands DROP logo_url',
  'ALTER TABLE brands DROP map_url',
  'ALTER TABLE brands DROP logo_url_wide',
  'ALTER TABLE brands DROP listing_url',
  'ALTER TABLE brands DROP search_bg_image_url',
  'ALTER TABLE brands DROP default_avatar',

  'ALTER TABLE brands DROP title',
  'ALTER TABLE brands DROP search_headline',

  'ALTER TABLE brands DROP default_user',

  'ALTER TABLE brands ADD assets   JSONB',
  'ALTER TABLE brands ADD messages JSONB',

  'ALTER TABLE offices DROP COLUMN brand'
]

const down = [
  'ALTER TABLE brands ADD subdomain TEXT',
  'ALTER TABLE brands ADD logo_url TEXT',
  'ALTER TABLE brands ADD map_url TEXT',
  'ALTER TABLE brands ADD logo_url_wide TEXT',
  'ALTER TABLE brands ADD listing_url TEXT',
  'ALTER TABLE brands ADD search_bg_image_url TEXT',
  'ALTER TABLE brands ADD default_avatar TEXT',
  'ALTER TABLE brands ADD title TEXT',
  'ALTER TABLE brands ADD search_headline TEXT',
  'ALTER TABLE brands ADD default_user TEXT',
  'ALTER TABLE brands ADD title',
  'ALTER TABLE brands ADD search_headline',

  'ALTER TABLE brands DROP assets',
  'ALTER TABLE brands DROP messages',

  'ALTER TABLE offices ADD brand uuid',

  'DROP TABLE brands_hostnames',
  'DROP TABLE brands_offices',
  'DROP TABLE brands_agents',
  'DROP TABLE brands_users'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
