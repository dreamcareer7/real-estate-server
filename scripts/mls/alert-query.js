#!/usr/bin/env node

require('../connection.js')
require('../../lib/utils/db.js')
require('../../lib/models/index.js')

const Alert = require('../../lib/models/Alert')


Alert.get(process.argv[2], (err, alert) => {
  if (err) {
    console.log(err)
    process.exit()
  }

  const q = Alert.buildQuery(alert)
  console.log(q.toString())
  process.exit()
})