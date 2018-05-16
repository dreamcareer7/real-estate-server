#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const promisify = require('../../lib/utils/promisify')

const update = async () => {
  await promisify(Envelope.update)(process.argv[2])

  process.exit()
}

update()
  .catch(e => {
    console.log(e)
    process.exit()
  })