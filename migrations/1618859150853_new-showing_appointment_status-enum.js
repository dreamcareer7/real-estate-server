const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE showing_appointment_status RENAME TO showing_appointment_status_old',
  `CREATE TYPE showing_appointment_status AS ENUM (
    'Canceled',
    'Completed',
    'Confirmed',
    'Requested',
    'Rescheduled'
  )`,
  'BEGIN',
  'ALTER TABLE showings_appointments RENAME status TO old_status',
  `ALTER TABLE showings_appointments
      ADD COLUMN status showing_appointment_status NOT NULL DEFAULT \'Requested\'::showing_appointment_status`,
  `UPDATE
    showings_appointments
  SET
    status = (CASE 
      WHEN old_status = 'Cancelled' THEN 'Canceled'::showing_appointment_status
      WHEN old_status = 'Finished' THEN 'Completed'::showing_appointment_status
      WHEN old_status = 'Accepted' THEN 'Confirmed'::showing_appointment_status
      WHEN old_status = 'Pending' THEN 'Requested'::showing_appointment_status
      WHEN old_status = 'Rescheduled' THEN 'Rescheduled'::showing_appointment_status
    END)
  `,
  'ALTER TABLE showings_appointments DROP COLUMN old_status',
  'COMMIT',
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = (cb) => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
