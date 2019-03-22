const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE deal_context SET
  key = 'contract_status',
  definition = (SELECT id FROM brands_contexts WHERE key = 'contract_status')
  WHERE key = 'listing_status' AND deal IN (
    SELECT id FROM deals WHERE deal_type = 'Buying'
  )`,
  `UPDATE deal_context SET text = 'Contract Terminated', value = 'Contract Terminated'
   WHERE key = 'contract_status' AND text = 'Cancelled'`,
  `UPDATE deal_context SET text = 'Lease Contract', value = 'Lease Contract'
   WHERE key = 'contract_status' AND text = 'Lease'`,
  `UPDATE deal_context SET text = 'Contract Terminated', value = 'Contract Terminated'
   WHERE key = 'contract_status' AND text = 'Expired'`,
  `UPDATE deal_context SET text = 'Contract Terminated', value = 'Contract Terminated'
   WHERE key = 'contract_status' AND text = 'Withdrawn'`,
  `UPDATE deal_context SET text = 'Contract Terminated', value = 'Contract Terminated'
   WHERE key = 'contract_status' AND text = 'Temp Off Market'`,
  `UPDATE deal_context SET text = 'Leased', value = 'Leased'
   WHERE key = 'contract_status' AND text = 'Sold' AND deal IN(
     SELECT id FROM deals WHERE property_type IN('Commercial Lease', 'Residential Lease')
  )`,
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
