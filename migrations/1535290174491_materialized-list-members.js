const _ = require('lodash')

const db = require('../lib/utils/db')
require('../lib/models')()

const ContactList = require('../lib/models/Contact/list')
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

  const res = await sql('SELECT csl.id, brands.name FROM contact_search_lists AS csl JOIN brands on brands.id = csl."brand"')
  const list_owners = _.keyBy(res.rows, 'id')

  const ids = res.rows.map(r => r.id)

  const lists = await ContactList.getAll(ids)

  let i = 0

  for(const list of lists) {
    await ListMember.updateListMemberships(list.id)
    console.log(`${++i}/${lists.length}`, list.name, 'for', list_owners[list.id].email)
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
