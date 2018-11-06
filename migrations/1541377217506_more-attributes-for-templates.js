'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `ALTER TYPE template_type
    ADD VALUE 'Birthday'`,

  `ALTER TYPE template_type
    ADD VALUE 'JustListed'`,

  `ALTER TYPE template_type
    ADD VALUE 'JustSold'`,

  `ALTER TYPE template_type
    ADD VALUE 'OpenHouse'`,

  'BEGIN',

  // templates.medium
  `CREATE TYPE template_medium AS ENUM
    ('Email', 'Social')`,
  'ALTER TABLE templates ADD medium template_medium',
  `UPDATE templates
    SET medium = 'Email'`,
  'ALTER TABLE templates ALTER medium SET NOT NULL',

  `UPDATE templates
    SET template_type = 'Birthday' WHERE template_type = 'Contact'`,

  `UPDATE templates
    SET template_type = 'OpenHouse' WHERE template_type = 'Listing' AND name ILIKE '%Open%'`,

  `UPDATE templates
    SET template_type = 'JustListed' WHERE name ILIKE '%Listed%'`,

  `UPDATE templates
    SET template_type = 'JustSold' WHERE name ILIKE '%Sold%'`,

  `ALTER TABLE templates ADD COLUMN video boolean NOT NULL DEFAULT FALSE`,

  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE templates DROP medium',
  'DROP TYPE template_medium',
  'ALTER TABLE templates DROP video',
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
