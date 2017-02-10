'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE notification_tokens RENAME TO notifications_tokens',
  'ALTER TABLE activities ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE activities ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE activities SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE activities SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE addresses ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE addresses ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE agents ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE agents ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE alerts ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE alerts ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE alerts SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE alerts SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE attachments ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE attachments ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE brands ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE brands ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE cmas ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE cmas ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE contacts ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE contacts ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE contacts SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE contacts SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE contacts_attributes ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE contacts_attributes ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE contacts_attributes SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE contacts_attributes SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE contacts_emails ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE contacts_emails ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE contacts_emails SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE contacts_emails SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE contacts_phone_numbers ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE contacts_phone_numbers ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE contacts_phone_numbers SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE contacts_phone_numbers SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE deals ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE deals ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE deals SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE deals SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE deals_roles ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE deals_roles ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE email_verifications ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE phone_verifications ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE envelopes ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE envelopes ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE envelopes SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE envelopes SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE envelopes_recipients ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE envelopes_recipients ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE files ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE files ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE files SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE files SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE files_relations ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE files_relations ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE forms ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE forms ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE forms SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE forms SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE forms_data ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE forms_data ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE forms_submissions ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE forms_submissions ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE godaddy_domains ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE godaddy_domains ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE godaddy_shoppers ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE godaddy_shoppers ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE invitation_records ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE invitation_records ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE listings ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE listings ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE messages ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE messages ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE messages SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE messages SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE messages_acks ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE mls_data ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE mls_jobs ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE migrations ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE messages ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE messages ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE notifications SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE notifications SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE notifications_tokens ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications_tokens ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications_deliveries ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications_deliveries ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications_users ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications_users ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE notifications_acks ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE offices ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE offices ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE open_houses ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE open_houses ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE password_recovery_records ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE password_recovery_records ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE photos ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE properties ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE properties ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE recommendations_eav ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE recommendations ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE recommendations ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE recommendations SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE recommendations SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE rooms ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE rooms ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'UPDATE rooms SET created_at = created_at + (NOW() - CLOCK_TIMESTAMP())',
  'UPDATE rooms SET updated_at = updated_at + (NOW() - CLOCK_TIMESTAMP())',
  'ALTER TABLE rooms_users ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE rooms_users ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE sessions ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE stripe_charges ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE stripe_charges ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE stripe_customers ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE stripe_customers ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE users ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE units ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE units ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE websites ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE websites ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE websites_snapshots ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE websites_snapshots ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()'
]

const down = [
  'ALTER TABLE notifications_tokens RENAME TO notification_tokens'
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
