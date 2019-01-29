'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO contacts_attribute_defs
    ("name",   "data_type", "label",  "section",      "required", "global", "singular", "show", "editable", "searchable", "has_label")
  VALUES
    ('social', 'text',      'Social', 'Contact Info', FALSE,      TRUE,     FALSE,      TRUE,   TRUE,       TRUE,         FALSE)
  `,
  'UPDATE contacts_attribute_defs SET has_label = FALSE, labels = NULL WHERE name = \'website\' AND global IS TRUE',
  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = 'social' LIMIT 1),
    attribute_type = 'social'
  WHERE
    attribute_type = 'website'
    AND label = ANY('{Facebook,Instagram,LinkedIn}'::text[])
  `,
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
