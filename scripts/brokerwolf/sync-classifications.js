#!/usr/bin/env node

require('../connection.js')
const BrokerWolf = require('../../lib/models/BrokerWolf')

const sync = async () => {
  await BrokerWolf.Classifications.sync(process.argv[2])
  process.exit()
}

sync()
