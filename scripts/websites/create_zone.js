#!/usr/bin/env node

require('../connection.js')
const { createZone } = require('../../lib/models/Godaddy/zone')
const { peanar } = require('../../lib/utils/peanar')

const wait = timeout => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout * 1000)
  })
}


const run = async () => {
  await createZone({
    domain: process.argv[2]
  })

  await peanar.enqueueContextJobs()
  await wait(5) // Need to wait until the email is actually sent
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
