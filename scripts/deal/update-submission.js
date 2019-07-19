#!/usr/bin/env node

require('../../lib/models/index.js')()
const promisify = require('../../lib/utils/promisify')
const db = require('../../lib/utils/db')

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client) => {
      if (err)
        return reject(err)

      client.query('BEGIN')
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

  const user = await User.getByEmail(process.argv[3])
  context.set({user})

  return Deal.updateForms({
    user,
    deal
  })
}

run()
  .then(() => {
    db.executeSql('COMMIT', [], (err) => {
      console.log('COMMIT RESULT', err)
      process.exit()
    })
  })
  .catch(e => {
    console.log(e)
    process.exit()
  })
