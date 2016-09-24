'use strict'

const db = require('../lib/utils/db')

exports.up = function (next) {
  db.conn((err, client) => {
    if (err)
      return next(err)

    return client.query('CREATE INDEX properties_lot_square_meters_idx ON properties(lot_square_meters)', next)
  })
}

exports.down = function (next) {
  db.conn((err, client) => {
    if (err)
      return next(err)

    return client.query('DROP INDEX properties_lot_square_meters_idx', next)
  })
}
