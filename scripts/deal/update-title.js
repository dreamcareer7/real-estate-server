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

  const deal = await promisify(Deal.get)(process.argv[2])
  console.log(deal.title)
  const updated = await Deal.updateTitle(deal)
  console.log(updated.title)
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
