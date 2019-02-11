'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `DROP FUNCTION user_brands(uuid)`,
  `CREATE OR REPLACE FUNCTION user_brands("user" uuid, roles text[]) RETURNS TABLE(
  brand uuid
)
AS
$$
  WITH roles AS (
    SELECT DISTINCT brands_roles.brand as brand FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    WHERE brands_users.user = $1
    AND (
      CASE
        WHEN $2 IS NULL THEN TRUE
        ELSE brands_roles.acl && $2
      END
    )
  )

SELECT brand_children(roles.brand) FROM roles
$$
LANGUAGE sql;`
]

const down = []

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
