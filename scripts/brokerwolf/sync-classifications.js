#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const sync = async () => {
  await BrokerWolf.Classifications.sync()
  process.exit()
}

sync()