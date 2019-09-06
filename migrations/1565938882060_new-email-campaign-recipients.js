const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE email_campaign_recipient_type RENAME TO email_campaign_send_type',
  'ALTER TABLE email_campaigns_recipients RENAME recipient_type TO send_type',
  'ALTER TABLE email_campaign_emails RENAME recipient_type TO send_type',
  `CREATE TYPE email_campaign_recipient_type AS ENUM
  ('Tag', 'List', 'Brand', 'AllContacts', 'Email')`,
  'ALTER TABLE email_campaigns_recipients ADD recipient_type email_campaign_recipient_type',
  `UPDATE email_campaigns_recipients
    SET recipient_type = 'Tag' WHERE tag IS NOT NULL`,
  `UPDATE email_campaigns_recipients
    SET recipient_type = 'List' WHERE list IS NOT NULL`,
  `UPDATE email_campaigns_recipients
    SET recipient_type = 'Email' WHERE email IS NOT NULL`,
  'ALTER TABLE email_campaigns_recipients ALTER recipient_type SET NOT NULL',
  'ALTER TABLE email_campaigns_recipients ADD brand uuid REFERENCES brands(id)',
  'ALTER TABLE email_campaigns_recipients DROP CONSTRAINT has_recipient',
  `ALTER TABLE email_campaigns_recipients ADD CONSTRAINT has_tag CHECK (
    (recipient_type = 'Tag' AND tag IS NOT NULL) OR (recipient_type <> 'Tag')
  )`,
  `ALTER TABLE email_campaigns_recipients ADD CONSTRAINT has_list CHECK (
    (recipient_type = 'List' AND list IS NOT NULL) OR (recipient_type <> 'List')
  )`,
  `ALTER TABLE email_campaigns_recipients ADD CONSTRAINT has_email CHECK (
    (recipient_type = 'Email' AND email IS NOT NULL) OR (recipient_type <> 'Email')
  )`,
  `ALTER TABLE email_campaigns_recipients ADD CONSTRAINT has_brand CHECK (
    (recipient_type = 'Brand' AND brand IS NOT NULL) OR (recipient_type <> 'Brand')
  )`,
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
