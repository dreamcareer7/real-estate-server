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

  const template = await Template.get(process.argv[2])
  const brand = await Brand.get(process.argv[3])

  await Template.generate({template, brand})
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
