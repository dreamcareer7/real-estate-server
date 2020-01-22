#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const update = async () => {
  const user = await User.getByEmail(process.argv[2])
  const client = await Client.get(process.argv[3])

  const link = await User.getLoginLink(user, client)
  console.log(link)

  process.exit()
}

update()
  .catch(e => {
    console.log(e)
    process.exit()
  })
