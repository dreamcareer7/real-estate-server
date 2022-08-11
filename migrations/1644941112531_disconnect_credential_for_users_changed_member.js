const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  // On Microsoft credentials
  `UPDATE microsoft_credentials 
    SET revoked = TRUE,
    updated_at = NOW() 
    WHERE
      deleted_at IS NULL 
      AND revoked IS NOT TRUE 
      AND NOT EXISTS (
      SELECT
        1 
      FROM
        brands b
        JOIN brands_roles r ON r.brand = b.
        ID JOIN brands_users u ON u.ROLE = r.ID 
      WHERE
        b.ID = microsoft_credentials.brand 
        AND u.USER = microsoft_credentials.USER 
        AND b.deleted_at IS NULL 
        AND r.deleted_at IS NULL 
      AND u.deleted_at IS NULL 
      )`,
  // On Google credentials
  `UPDATE google_credentials 
    SET revoked = TRUE,
    updated_at = NOW() 
    WHERE
      deleted_at IS NULL 
      AND revoked IS NOT TRUE 
      AND NOT EXISTS (
      SELECT
        1 
      FROM
        brands b
        JOIN brands_roles r ON r.brand = b.
        ID JOIN brands_users u ON u.ROLE = r.ID 
      WHERE
        b.ID = google_credentials.brand 
        AND u.USER = google_credentials.USER 
        AND b.deleted_at IS NULL 
        AND r.deleted_at IS NULL 
      AND u.deleted_at IS NULL 
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
