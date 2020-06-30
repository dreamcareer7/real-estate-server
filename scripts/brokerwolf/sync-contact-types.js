#!/usr/bin/env node

require('../connection.js')
const BrokerWolf = require('../../lib/models/Brokerwolf')

const sync = async () => {
  await BrokerWolf.ContactTypes.sync(process.argv[2])
  process.exit()
}

sync()
