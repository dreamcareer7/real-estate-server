'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')


const up = [
  'BEGIN',
  `ALTER TABLE calendar_feed_settings
  drop constraint calendar_feed_settings_selected_brand_fkey;
  alter table calendar_feed_settings
  add constraint calendar_feed_settings_selected_brand_fkey
  foreign key (selected_brand)
  references brands (id)`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_last_touch_for_contacts(uuid[])',
  'COMMIT'
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
