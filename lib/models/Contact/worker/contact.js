const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const { peanar } = require('../../../utils/peanar')

const Contact = require('../manipulate')
const { fastFilter } = require('../fast_filter')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW CONCURRENTLY contacts_users', [])
}

async function create_default_tags(user_id, brand_id) {
  const q = `WITH default_tags(tag, touch_freq) AS ( VALUES
    ('Warm', 30),
    ('Hot', 7),
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

/**
 * @param {UUID[]} contact_ids 
 * @param {UUID} user_id 
 * @param {UUID} brand_id 
 */
async function unpark_contacts(contact_ids, user_id, brand_id) {
  return Contact.update(contact_ids.map(id => ({ id, parked: false })), user_id, brand_id, 'system')
}

/**
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {IContactAttributeFilter[]} filter
 * @param {IContactFilterOptions & PaginationOptions | undefined} query
 */
async function delete_contacts(user_id, brand_id, filter, query) {
  const { ids, totalCount } = await fastFilter(brand_id, user_id, filter, query)
  if (totalCount < 1) return

  return Contact.delete(ids, user_id, 'direct_request')
}

module.exports = {
  refreshContactsUsers,
  unpark_contacts: peanar.job({
    handler: unpark_contacts,
    exchange: 'contacts',
    queue: 'contacts',
  }),
  create_default_tags: peanar.job({
    handler: create_default_tags,
    exchange: 'contacts',
    queue: 'contacts',
  }),
  delete_contacts: peanar.job({
    handler: delete_contacts,
    exchange: 'contacts',
    queue: 'contacts',
  }),
}
