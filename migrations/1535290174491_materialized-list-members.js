const _ = require('lodash')

const db = require('../lib/utils/db')
require('../lib/models')()
const Context = require('../lib/models/Context')

const ListMember = require('../lib/models/Contact/list_members')

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
  const { client: conn, release } = await getDb()

  const context = Context.create()
  context.set({
    db: conn
  })
  context.enter()

  await sql('BEGIN')

  const res = await sql('SELECT csl.id, csl.name, brands.name AS brand FROM contact_search_lists AS csl JOIN brands on brands.id = csl."brand"')
  const list_owners = _.keyBy(res.rows, 'id')

  let i = 0

  for(const list of res.rows) {
    await ListMember.updateListMemberships(list.id)
    console.log(`${++i}/${res.rows.length}`, list.name, 'for', list_owners[list.id].brand)
  }

  await sql('COMMIT')
  
  release()
}

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client, release) => {
      if (err)
        return reject(err)

      resolve({ client, release })
    })
  })
}

exports.up = cb => run().nodeify(cb)
exports.down = cb => cb()
