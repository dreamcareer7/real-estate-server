const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE
    brands_contexts
  SET
    exports = TRUE
  WHERE
    key = ANY('{list_date, expiration_date, contract_date, inspection_date, option_period, financing_due, title_due, t47_due, closing_date, possession_date, list_price, sales_price, leased_price, full_address, unit_number, building_number, project_name, lot_number, block_number, subdivision, street_number, street_dir_prefix, street_name, street_suffix, street_address, city, state, state_code, postal_code, county, year_built, listing_status, mls_number, mls_area_major, mls_area_minor, file_id, commission_listing, commission_selling, property_type, square_meters, lease_price, lease_executed, lease_application_date, lease_begin, lease_end, title_company, ender_type, 12a1b, charitable_donations, ranch_name}'::text[])`,
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
