#!/usr/bin/env node

require('../../lib/models/index.js')()

const Context = require('../../lib/models/Context')
const db = require('../../lib/utils/db')
const BrandTemplate = require('../../lib/models/Template/brand')


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

  const brand_template = await BrandTemplate.get(process.argv[2])
  await BrandTemplate.generateThumbnail(brand_template)

}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })