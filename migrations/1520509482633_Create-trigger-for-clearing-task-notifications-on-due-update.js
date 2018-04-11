'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION
  clear_task_notifications() RETURNS TRIGGER
  LANGUAGE plpgsql
  STRICT
  AS $$
    BEGIN
      UPDATE crm_tasks SET "notification" = NULL WHERE id = NEW.id;
      UPDATE reminders SET "notification" = NULL WHERE task = NEW.id;
      RETURN NEW;
    END;
  $$`,
  `CREATE TRIGGER clear_crm_task_notifications_on_due_update
  AFTER UPDATE OF due_date ON crm_tasks
  FOR EACH ROW
  WHEN (NEW.due_date > NOW())
  EXECUTE PROCEDURE clear_task_notifications()`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TRIGGER clear_crm_task_notifications_on_due_update ON crm_tasks',
  'DROP FUNCTION clear_task_notifications',
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
