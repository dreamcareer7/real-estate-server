#!/usr/bin/env node

require('../../lib/models/index.js')()
const promisify = require('../../lib/utils/promisify')
const db = require('../../lib/utils/db')

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client) => {
      if (err)
        return reject(err)

      resolve(client)
    })
  })
}


const run = async () => {
  const context = Context.create()
  context.set({
    db: await getDb()
  })
  context.enter()

  const res = await db.executeSql.promise('SELECT id FROM deals')
  const ids = res.rows.map(r => r.id)

  const deals = await promisify(Deal.getAll)(ids)

  let i = 0

  for(const deal of deals) {
    const updated = await Deal.updateTitle(deal)
    console.log(`${++i}/${deals.length}`, updated.id, updated.title)
  }
}

run()
  .catch(e => {
    console.log(e)
    process.exit()
  })