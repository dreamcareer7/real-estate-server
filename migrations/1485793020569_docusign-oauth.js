'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE docusign_users DROP docusign_id',
  'ALTER TABLE docusign_users ADD access_token  TEXT NOT NULL',
  'ALTER TABLE docusign_users ADD refresh_token TEXT NOT NULL',
  'ALTER TABLE docusign_users ADD base_url TEXT NOT NULL',
  'ALTER TABLE docusign_users ADD account_id uuid NOT NULL',
  'ALTER TABLE docusign_users ADD CONSTRAINT docusign_user_code UNIQUE("user")',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE docusign_users DROP access_token',
  'ALTER TABLE docusign_users DROP refresh_token',
  'ALTER TABLE docusign_users DROP base_url',
  'ALTER TABLE docusign_users DROP account_id',
  'ALTER TABLE docusign_users ADD docusign_id uuid NOT NULL',
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
