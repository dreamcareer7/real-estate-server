const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX CONCURRENTLY listings_filters_list_agent_mui ON listings_filters(list_agent_mui)',
  'CREATE INDEX CONCURRENTLY listings_filters_co_list_agent_mui ON listings_filters(co_list_agent_mui)',
  'CREATE INDEX CONCURRENTLY listings_filters_selling_agent_mui ON listings_filters(selling_agent_mui)',
  'CREATE INDEX CONCURRENTLY listings_filters_co_selling_agent_mui ON listings_filters(co_selling_agent_mui)',
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
