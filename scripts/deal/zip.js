#!/usr/bin/env node

require('../connection.js')

const Deal = {
  ...require('../../lib/models/Deal/get'),
  ...require('../../lib/models/Deal/zip'),
}

const promisify = require('../../lib/utils/promisify')

const run = async () => {
  const deal = await promisify(Deal.get)(process.argv[2])

  const stream = await Deal.zip(deal)

  const write = require('fs').createWriteStream(process.argv[3])

  stream.pipe(write)

  write.on('finish', process.exit)
}

run()
  .catch(e => {
    console.log(e)
  })
