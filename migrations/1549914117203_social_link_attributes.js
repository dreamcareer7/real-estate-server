'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO contacts_attribute_defs
    ("name",      "data_type", "label",     "section",      "required", "global", "singular", "show", "editable", "searchable", "has_label")
  VALUES
    ('facebook',  'text',      'Facebook',  'Contact Info', FALSE,      TRUE,     TRUE,       FALSE,  TRUE,       TRUE,         FALSE),
    ('instagram', 'text',      'Instagram', 'Contact Info', FALSE,      TRUE,     TRUE,       FALSE,  TRUE,       TRUE,         FALSE),
    ('linkedin',  'text',      'Linkedin',  'Contact Info', FALSE,      TRUE,     TRUE,       FALSE,  TRUE,       TRUE,         FALSE)
  `,
  'UPDATE contacts_attribute_defs SET has_label = FALSE WHERE name = \'social\'',
  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = 'facebook' LIMIT 1),
    attribute_type = 'facebook',
    label = NULL
  WHERE
    attribute_type = 'social'
    AND label ILIKE 'Facebook'
  `,
  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = 'instagram' LIMIT 1),
    attribute_type = 'instagram',
    label = NULL
  WHERE
    attribute_type = 'social'
    AND label ILIKE 'Instagram'
  `,
  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE name = 'linkedin' LIMIT 1),
    attribute_type = 'linkedin',
    label = NULL
  WHERE
    attribute_type = 'social'
    AND label ILIKE 'LinkedIn'
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
