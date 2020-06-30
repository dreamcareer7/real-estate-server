#!/usr/bin/env node

require('../connection.js')
const BrokerWolf = require('../../lib/models/BrokerWolf')

const sync = async () => {
  await BrokerWolf.PropertyTypes.sync(process.argv[2])
  process.exit()
}

sync()
