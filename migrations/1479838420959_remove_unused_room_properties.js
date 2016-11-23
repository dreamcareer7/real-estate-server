'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE rooms DROP COLUMN IF EXISTS lead_agent;',
  'ALTER TABLE rooms DROP COLUMN IF EXISTS status;',
  'ALTER TABLE rooms DROP COLUMN IF EXISTS client_type;',
  'ALTER TABLE rooms DROP COLUMN IF EXISTS room_code;',
  'ALTER TABLE rooms_users DROP COLUMN IF EXISTS user_status',
]

const down = [
  'ALTER TABLE rooms ADD lead_agent uuid;',
  'ALTER TABLE rooms ADD status room_status DEFAULT \'New\'::room_status;',
  'ALTER TABLE rooms ADD client_type client_type NOT NULL;',
  'ALTER TABLE rooms ADD room_code integer NOT NULL DEFAULT nextval(\'rooms_room_code_seq\')',
  'ALTER TABLE rooms_users ADD user_status user_on_room_status NOT NULL DEFAULT \'Active\'::user_on_room_status'
]

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

exports.up = run(up)
exports.down = run(down)
