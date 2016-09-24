'use strict'

const db = require('../lib/utils/db')

const createDb = 'CREATE TABLE IF NOT EXISTS migrations ( created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), state jsonb );'
const insert = 'INSERT INTO migrations (state) VALUES (\'{"pos":14}\');'
const dropDb = 'DROP TABLE migrations'

function up (next) {
  db.conn((err, client) => {
    if (err)
      return next(err)

    client.query(createDb, (err) => {
      if (err)
        return next(err)

      client.query(insert, next)
    })
  })
}

function down (next) {
  db.conn((err, client) => {
    if (err)
      return next(err)

    client.query(dropDb, next)
  })
}

exports.up = up
exports.down = down
