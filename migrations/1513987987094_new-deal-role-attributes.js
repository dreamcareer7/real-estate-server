'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE deals_roles ADD email TEXT',
  `UPDATE deals_roles
    SET email = (SELECT email FROM users WHERE id = deals_roles.user)`,
  'ALTER TABLE deals_roles ALTER COLUMN email SET NOT NULL',
  'ALTER TABLE deals_roles ADD phone_number TEXT',
  'ALTER TABLE deals_roles DROP CONSTRAINT deals_roles_unique',
  'ALTER TABLE deals_roles ALTER "user" DROP NOT NULL',
  'ALTER TABLE envelopes_recipients DROP "user"',
  'ALTER TABLE envelopes_recipients DROP role',
  'ALTER TABLE envelopes_recipients ADD role uuid REFERENCES deals_roles(id)',
  `UPDATE envelopes_recipients SET role = (
    SELECT id FROM deals_roles WHERE
      "user" = envelopes_recipients.user
      AND deal = (
        SELECT deal FROM envelopes WHERE id = envelopes_recipients.envelope
      )
  )`,
  'ALTER TABLE envelopes_recipients ALTER role SET NOT NULL',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals_roles DROP email',
  'ALTER TABLE deals_roles DROP phone_number',
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
