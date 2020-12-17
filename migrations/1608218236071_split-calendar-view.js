const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const subviews = [
  'activity',
  'contact',
  'contact_attribute',
  'crm_association',
  'crm_task',
  'deal_context',
  'email_campaign_email_executed',
  'email_campaign_executed',
  'email_campaign_scheduled',
  'email_thread',
  'email_thread_recipient',
  'flow',
  'home_anniversary',
].flatMap(name => [
  `DROP VIEW IF EXISTS calendar.${name}`,
  fs.readFileSync(path.resolve('./lib/sql/calendar/subviews', `${name}.calendar.view.sql`), { encoding: 'utf-8' })
])

const migrations = [
  'BEGIN',
  'CREATE SCHEMA IF NOT EXISTS calendar',

  ...subviews,

  'DROP VIEW IF EXISTS analytics.calendar',
  fs.readFileSync(path.resolve('./lib/sql/calendar/calendar.view.sql'), { encoding: 'utf-8' }),

  fs.readFileSync(path.resolve('./lib/sql/trigger/triggers_due.view.sql'), { encoding: 'utf-8' }),

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
