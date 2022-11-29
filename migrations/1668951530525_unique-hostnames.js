const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'WITH w AS (SELECT LOWER(wh.hostname), uuid_timestamp(wh.id), wh.id FROM websites_hostnames wh  WHERE LOWER(wh.hostname) IN(SELECT LOWER(hostname)  FROM websites_hostnames GROUP BY 1 HAVING count(*) > 1) ORDER BY 1,2), w2 AS(SELECT ROW_NUMBER() OVER(), * FROM w) DELETE FROM websites_hostnames WHERE id IN(SELECT id FROM w2 WHERE row_number %2 = 0) RETURNING *, uuid_timestamp(id)',
  'DROP INDEX websites_hostnames_hostname',
  'CREATE UNIQUE INDEX websites_hostnames_hostname_unique ON websites_hostnames (lower(hostname))',
  'ALTER TABLE websites_hostnames DROP CONSTRAINT websites_hostnames_key',
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
