'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE deal_type AS ENUM (
    'Buying',
    'Selling'
  )`,
  `CREATE TABLE deals (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    deleted_at timestamp with time zone,
    deal_type deal_type NOT NULL,
    listing uuid REFERENCES listings(id),
    created_by uuid REFERENCES users(id)
  )`,
  `CREATE TYPE deal_role AS ENUM (
    'BuyerAgent',
    'CoBuyerAgent',
    'SellerAgent',
    'CoSellerAgent',
    'Buyer',
    'Seller',
    'Title',
    'Lawyer',
    'Lender',
    'TeamLead',
    'Appraiser',
    'Inspector'
  )`,
  `CREATE TABLE deals_roles (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    deleted_at timestamp with time zone,
    created_by uuid NOT NULL REFERENCES users(id),
    role deal_role NOT NULL,
    deal uuid NOT NULL REFERENCES deals(id),
    "user" uuid NOT NULL REFERENCES users(id)
  )`,
  'TRUNCATE TABLE forms_submissions CASCADE',
  'ALTER TABLE forms_submissions ADD deal uuid NOT NULL REFERENCES deals(id)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE deals_roles',
  'DROP TABLE deals',
  'DROP TYPE deal_role',
  'DROP TYPE deal_type',
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
