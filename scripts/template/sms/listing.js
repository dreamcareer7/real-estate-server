#!/usr/bin/env node

const Context = require('../../../lib/models/Context')
const db = require('../../../lib/utils/db')
const User = require('../../../lib/models/User')
const Listing = require('../../../lib/models/Listing/get')

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

  const user = await User.getByEmail(process.argv[2])
  const listings = await Listing.getByMLSNumber(process.argv[3])

  const loginUrl = await User.getLoginLink({
    user,
    options: {
      action: 'OpenMarketingWizard',
      listing: listings[0].id,
    }
  })

  console.log(loginUrl)
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
