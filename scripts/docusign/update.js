#!/usr/bin/env node

require('../connection.js')
const Envelope = require('../../lib/models/Envelope')
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
