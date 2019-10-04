const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE listings_filters ADD list_agent_mui       bigint',
  'ALTER TABLE listings_filters ADD co_list_agent_mui    bigint',
  'ALTER TABLE listings_filters ADD selling_agent_mui    bigint',
  'ALTER TABLE listings_filters ADD co_selling_agent_mui bigint',

  `UPDATE listings_filters SET
    list_agent_mui       = listings.list_agent_mui,
    co_list_agent_mui    = listings.co_list_agent_mui,
    selling_agent_mui    = listings.selling_agent_mui,
    co_selling_agent_mui = listings.co_selling_agent_mui
  FROM listings
  WHERE listings_filters.id = listings.id`,

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
