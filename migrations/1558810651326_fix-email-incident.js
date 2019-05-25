const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE FUNCTION fix_email_disaster(campaign uuid) RETURNS void LANGUAGE SQL AS $$
    WITH mistaken_emails AS (
      SELECT
        ee.id
      FROM
        email_campaign_emails AS ee
        JOIN contacts AS c
          ON ee.contact = c.id
        JOIN email_campaigns AS e
          ON ee.campaign = e.id
      WHERE
        e.id = $1
        AND c.brand <> e.brand
    ), delete_ee AS (
      DELETE FROM
        email_campaign_emails AS ee
      WHERE
        ee.id = ANY(SELECT id FROM mistaken_emails)
      RETURNING ee.email
    )
    UPDATE
      emails
    SET
      campaign = NULL
    FROM
      delete_ee AS de
    WHERE
      emails.id = de.email;
    
    SELECT update_email_campaign_stats($1);
  $$`,
  `WITH campaigns AS (
    SELECT
      distinct(ec.id)
    FROM
      email_campaigns AS ec
    JOIN email_campaign_emails AS ece
      ON ec.id = ece.campaign
    JOIN contacts AS c
      ON ece.contact = c.id
    WHERE
      c.brand <> ec.brand
  )
  SELECT
    fix_email_disaster(campaigns.id)
  FROM
    campaigns
  `,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
