#!/usr/bin/env node

const { getByEmail }  = require('../../lib/models/User/get')
const Email = require('../../lib/models/Email/get')

require('../connection.js')
const fs = require('fs')
const { generate } = require('../../lib/models/Daily/generate')

const send = async () => {
  const user = await getByEmail(process.argv[2])
  if (!user)
    throw Error.ResourceNotFound()

  const html = await generate(user)

  fs.writeFileSync('/tmp/1.html', html)
}

send()
  .catch(e => {
    console.log(e)
    process.exit()
  })
