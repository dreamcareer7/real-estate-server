const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const { peanar } = require('../../../utils/peanar')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW CONCURRENTLY contacts_users', [])
}

async function create_default_tags(user_id, brand_id) {
  const q = `WITH default_tags(tag, touch_freq) AS ( VALUES
    ('Warm List', 30),
    ('Hot List', 7),
    ('Past Client', 60),
    ('Seller', NULL),
    ('Agent', NULL),
    ('Buyer', NULL)
  )
  INSERT INTO crm_tags (
    brand,
    created_by,
    tag,
    touch_freq
  )
  SELECT
    $1::uuid, $2::uuid, tag, touch_freq
  FROM
    default_tags`

  await sql.query(q, [brand_id, user_id])
}

module.exports = {
  refreshContactsUsers,
  create_default_tags: peanar.job({ handler: create_default_tags, exchange: 'contacts', queue: 'contacts' })
}
