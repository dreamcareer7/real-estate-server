#!/usr/bin/env node

require('../../lib/models/index.js')()
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

  const brand = await Brand.get(process.argv[2])

  const templates = await Template.getForBrand({
    brand: brand.id
  })

  for(template of templates)
    await Template.generateThumbnailForBrand({template, brand})
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
