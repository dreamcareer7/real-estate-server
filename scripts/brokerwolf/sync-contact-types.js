#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const sync = async () => {
  await BrokerWolf.ContactTypes.sync(process.argv[2])
  process.exit()
}

sync()
