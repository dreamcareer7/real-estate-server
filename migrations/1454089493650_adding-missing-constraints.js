'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE recommendations_eav ADD CONSTRAINT recommendations_eav_user_recommendation_action_key UNIQUE ("user", recommendation, action)',
  'ALTER TABLE notifications_acks ALTER COLUMN id SET NOT NULL'
]

const down = []

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

const remove = (id, cb) => {
  const q = 'DELETE FROM recommendations_eav WHERE id = $1'

  db.conn((err, conn, done) => {
    if (err)
      return cb(err)

    conn.query(q, [id], (err) => {
      done()

      if (err)
        return cb(err)

      cb()
    })
  })
}

const clean = (cb) => {
  const q = 'SELECT ARRAY_AGG(id) as ids FROM recommendations_eav GROUP BY user, recommendation, action HAVING count(*) > 1'

  db.conn((err, client, done) => {
    if (err)
      return cb(err)

    client.query(q, (err, res) => {
      done()
      if (err)
        return cb(err)

      let toDelete = []

      res.rows.forEach(set => {
        set.ids.pop()
        toDelete = toDelete.concat(set.ids)
      })

      async.eachLimit(toDelete, 10, remove, cb)
    })
  })
}

exports.up = (cb) => {
  clean(err => {
    if (err)
      return cb(err)

    runAll(up, cb)
  })
}

exports.down = run(down)
