#!/usr/bin/env node

const { justListed, openHouse, priceImprovement, justSold } = require('../../lib/models/Listing/notify-agents')
const createContext = require('../workers/utils/create-context')

const send = async () => {
  const id = process.argv[2]

  await justListed(id)
  await priceImprovement(id)
  await openHouse(id)
  await justSold(id)
}

async function main() {
  const { commit, run } = await createContext()

  await run(async () => {
    await send()
    await commit()
  })
}

main()
  .then(() => {
    setTimeout(process.exit, 2000)
  })
  .catch(e => {
    console.log(e)
    process.exit()
  })
