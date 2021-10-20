const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP INDEX IF EXISTS super_campaigns_eligibility_super_campaign_idx',
  'DROP INDEX IF EXISTS super_campaigns_enrollments_campaign_brand_idx',
  'DROP TABLE IF EXISTS super_campaigns_eligibility',
  `CREATE TABLE super_campaigns_eligibility (
    super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
    brand uuid NOT NULL REFERENCES brands (id),
    created_at timestamp DEFAULT now(),

    PRIMARY KEY (super_campaign, brand)
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
