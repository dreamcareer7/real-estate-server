'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `WITH attr_labels (name, labels) AS (VALUES
    ('phone_number', ARRAY['Home', 'Mobile', 'Work', 'Fax', 'Pager', 'Other']),
    ('email', ARRAY['Personal', 'Work', 'Other']),
    ('important_date', ARRAY['Anniversary', 'First Home Anniversary']),
    ('website', ARRAY['Website', 'Twitter', 'Facebook', 'Instagram', 'Blog']),
    ('street_name', ARRAY['Home', 'Work', 'Other']),
    ('street_number', ARRAY['Home', 'Work', 'Other']),
    ('street_prefix', ARRAY['Home', 'Work', 'Other']),
    ('street_suffix', ARRAY['Home', 'Work', 'Other']),
    ('unit_number', ARRAY['Home', 'Work', 'Other']),
    ('city', ARRAY['Home', 'Work', 'Other']),
    ('state', ARRAY['Home', 'Work', 'Other']),
    ('country', ARRAY['Home', 'Work', 'Other']),
    ('postal_code', ARRAY['Home', 'Work', 'Other'])
  )
  UPDATE
    contacts_attribute_defs
  SET
    has_label = true,
    labels = attr_labels.labels
  FROM
    attr_labels
  WHERE
    contacts_attribute_defs.name = attr_labels.name`,
  'COMMIT'
]

const down = []

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err) return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = queries => {
  return next => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
