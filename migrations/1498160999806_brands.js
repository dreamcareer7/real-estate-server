'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const brand_agents = fs.readFileSync('./lib/sql/brand/get_brand_agents.fn.sql').toString()
const brand_users = fs.readFileSync('./lib/sql/brand/get_brand_users.fn.sql').toString()
const propose = fs.readFileSync('./lib/sql/brand/propose_brand_agents.fn.sql').toString()

const up = [
  'BEGIN',
  `CREATE TABLE brands_tags (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    tag TEXT NOT NULL,
    brand uuid NOT NULL REFERENCES brands(id),
    color CHAR(7) NOT NULL,
    is_tab BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(brand, tag)
   )`,
  `CREATE TABLE brands_roles (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    brand uuid NOT NULL REFERENCES brands(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    role text
  )`,
  'DROP TABLE brands_users',
  `CREATE TABLE brands_users (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    "user" uuid NOT NULL REFERENCES users(id),
    role uuid NOT NULL REFERENCES brands_roles(id)
  )`,
  `CREATE TABLE brands_roles_tags (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    role uuid NOT NULL REFERENCES brands_roles(id),
    tag uuid NOT NULL REFERENCES brands_tags(id)
  )`,
  brand_agents,
  brand_users,
  propose,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE brands_tags',
  'DROP TABLE brands_roles',
  'DROP TABLE brands_roles_tags',
  'COMMIT'
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
