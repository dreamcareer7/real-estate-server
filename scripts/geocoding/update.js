#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const promisify = require('../../lib/utils/promisify')

const update = async () => {
  await promisify(Address.updateGeo)(process.argv[2])

  process.exit()
}

update()
  .catch(e => {
    console.log(e)
    process.exit()
  })