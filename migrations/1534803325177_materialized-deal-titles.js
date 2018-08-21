const db = require('../lib/utils/db')
const promisify = require('../lib/utils/promisify')
require('../lib/models')()

const sql = async (sql, args) => {
  return new Promise((resolve, reject) => {
    db.executeSql(sql, args, null, (err, res) => {
      if (err)
        return reject(err)

      resolve(res)
    })
  })
}

const run = async () => {
  const conn = await getDb()

  const context = Context.create()
  context.set({
    db: conn
  })
  context.enter()

  await sql('BEGIN')

  await sql('ALTER TABLE deals ADD COLUMN IF NOT EXISTS title TEXT')

  const res = await sql('SELECT id FROM deals')
  const ids = res.rows.map(r => r.id)

  const deals = await promisify(Deal.getAll)(ids)

  let i = 0

  for(const deal of deals) {
    const updated = await Deal.updateTitle(deal)
    console.log(`${++i}/${deals.length}`, updated.title)
  }

  await sql('COMMIT')
}

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client) => {
      if (err)
        return reject(err)

      resolve(client)
    })
  })
}

exports.up = cb => run().nodeify(cb)
exports.down = cb => cb()
