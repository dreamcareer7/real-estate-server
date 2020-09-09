#!/usr/bin/env node

require('../connection.js')
const Client = require('../../lib/models/Client/get')
const User = require('../../lib/models/User')

const update = async () => {
  const user = await User.getByEmail(process.argv[2])

  const link = await User.getLoginLink({user})
  console.log(link)

  process.exit()
}

update()
  .catch(e => {
    console.log(e)
    process.exit()
  })
