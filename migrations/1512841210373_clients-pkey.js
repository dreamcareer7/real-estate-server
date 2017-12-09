'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `WITH to_preserve AS (
    SELECT DISTINCT ON(id)
      id, version
    FROM clients
    WHERE id IN(SELECT id FROM clients GROUP BY id HAVING count(*) > 1) ORDER BY id, version DESC
  )

  DELETE FROM clients WHERE id IN (SELECT id FROM to_preserve) AND version NOT IN(SELECT version FROM to_preserve)`,

  'ALTER TABLE clients ADD PRIMARY KEY(id)',
  'ALTER TABLE tokens ADD FOREIGN KEY (client) REFERENCES clients(id)'
]

const down = [
  'ALTER TABLE tokens DROP CONSTRAINT tokens_client_fkey',
  'ALTER TABLE clients DROP CONSTRAINT clients_pkey'
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
