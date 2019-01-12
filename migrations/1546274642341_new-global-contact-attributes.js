'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO contacts_attribute_defs
    ("name",                "data_type", "label",               "section", "required", "global", "singular", "show", "editable", "searchable", "has_label")
  VALUES
    ('work_anniversary',    'date',      'Work Anniversary',    'Dates',   FALSE,      TRUE,     TRUE,       FALSE,  TRUE,       FALSE,        FALSE),
    ('wedding_anniversary', 'date',      'Wedding Anniversary', 'Dates',   FALSE,      TRUE,     TRUE,       FALSE,  TRUE,       FALSE,        FALSE),
    ('home_anniversary',    'date',      'Home Anniversary',    'Dates',   FALSE,      TRUE,     TRUE,       FALSE,  TRUE,       FALSE,        FALSE),
    ('child_birthday',      'date',      'Child Birthday',      'Dates',   FALSE,      TRUE,     FALSE,      FALSE,  TRUE,       FALSE,        TRUE)
  `,
  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE "name" = 'work_anniversary' AND global IS TRUE LIMIT 1),
    attribute_type = 'work_anniversary',
    label = NULL
  WHERE
    attribute_type = 'important_date'
    AND label = 'Work Anniversary'
  `,

  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE "name" = 'wedding_anniversary' AND global IS TRUE LIMIT 1),
    attribute_type = 'wedding_anniversary',
    label = NULL
  WHERE
    attribute_type = 'important_date'
    AND label = 'Wedding Anniversary'
  `,

  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE "name" = 'home_anniversary' AND global IS TRUE LIMIT 1),
    attribute_type = 'home_anniversary',
    label = NULL
  WHERE
    attribute_type = 'important_date'
    AND label = 'Home Anniversary'
  `,

  `UPDATE
    contacts_attributes
  SET
    attribute_def = (SELECT id FROM contacts_attribute_defs WHERE "name" = 'child_birthday' AND global IS TRUE LIMIT 1),
    attribute_type = 'child_birthday',
    label = NULL
  WHERE
    attribute_type = 'important_date'
    AND (label = 'Child Birthday' OR label = 'Child')
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
