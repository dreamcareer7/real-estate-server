#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const create = async(action, uri) => {
  const url = uri ? Url.web({
    uri
  }) : undefined

  const b = {
    action,
    '$desktop_url': url,
    '$fallback_url': url
  }

  console.log(b)
  const u = await Branch.createURL(b)
  console.log(u)
  process.exit()
}

create(process.argv[2], process.argv[3])
  .catch(e => {
    console.log(e)
    process.exit()
  })
