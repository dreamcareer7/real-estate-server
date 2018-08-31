'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION user_has_contact_with_another(uuid, uuid) RETURNS boolean
    LANGUAGE SQL
    STABLE
    AS $$
      SELECT EXISTS(
        SELECT c.id
        FROM contacts c
        JOIN contacts_users cu
          ON c.id = cu.contact
        WHERE c."user" = '163db054-f5bb-11e5-bf57-f23c91b0d077'::uuid
        AND cu."user" = 'fc1ae8e6-480f-11e8-8b24-0a95998482ac'::uuid
      ) AS is_connected
    $$`,
  'COMMIT'
]

const down = [
]

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
