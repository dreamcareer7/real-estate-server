const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE mls_transaction_type
    AS ENUM('Sale', 'Lease', 'Sale Or Lease', 'Timeshare', 'Unknown')`,

  `CREATE TYPE mls_usage_type
    AS ENUM('Residential', 'Commercial', 'Industrial', 'Land', 'Mixed', 'Unknown')`,

  `CREATE TYPE mls_structure_type
    AS ENUM('Apartment', 'Duplex', 'Triplex', 'Fourplex', 'FiveplexPlus', 'House', 'Townhouse', 'Condo','HalfDuplex', 'Mobile', 'Cabin', 'Studio', 'SingleFamily', 'MultiFamily', 'Hotel', 'Farm', 'Retail', 'Penthouse', 'BoatSlip', 'Office', 'Warehouse', 'Parking', 'Loft', 'Historic', 'Patio', 'Unknown')`,

  'ALTER TABLE listings ADD IF NOT EXISTS transaction_type mls_transaction_type  DEFAULT \'Unknown\'',
  'ALTER TABLE listings ADD IF NOT EXISTS usage_type       mls_usage_type        DEFAULT \'Unknown\'',
  'ALTER TABLE listings ADD IF NOT EXISTS structure_type   mls_structure_type    DEFAULT \'Unknown\'',

  'ALTER TABLE listings ADD IF NOT EXISTS original_mls_property_type TEXT',
  'ALTER TABLE listings ADD IF NOT EXISTS original_mls_property_subtype TEXT',
  'ALTER TABLE listings ADD IF NOT EXISTS original_mls_status TEXT',

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
