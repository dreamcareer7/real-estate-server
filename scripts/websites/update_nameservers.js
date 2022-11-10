#!/usr/bin/env node

require('../connection.js')
const promisify = require('../../lib/utils/promisify')
const db = require('../../lib/utils/db')
const godaddy = require('../../lib/models/Godaddy/client')
const config = require('../../lib/config')

const name_servers = config.godaddy.nameservers


const update = async domain => {
  await promisify(godaddy.domains.update)({domain, name_servers})
}

const run = async () => {
  const domains = (await db.executeSql.promise('SELECT * FROM godaddy_domains')).rows

  let i = 1
  for(const domain of domains) {
    try {
      await update(domain.name)
    } catch(e) {
      console.log(domain.name, e)
    }
    console.log(`${i++}/${domains.length} \t ${domain.name}`)
  }
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
