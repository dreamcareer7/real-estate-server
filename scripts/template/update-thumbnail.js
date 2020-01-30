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

  const template = await Template.get(process.argv[2])
  const brand_id = process.argv[3]

  if (brand_id) {
    const brand = await Brand.get(brand_id)
    await Template.generateThumbnailForBrand({template, brand})
    return
  }

  await Template.generateThumbnails(template)
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
