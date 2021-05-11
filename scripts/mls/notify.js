#!/usr/bin/env node

const { justListed, openHouse, priceImprovement } = require('../../lib/models/Listing/notify-agents')
const Listing = require('../../lib/models/Listing/get')
const promisify = require('../../lib/utils/promisify')
const createContext = require('../workers/create-context')

const send = async () => {
  const listing = await promisify(Listing.get)(process.argv[2])

  if (!listing)
    throw Error.ResourceNotFound()

  await justListed(listing)
  await priceImprovement(listing)
  await openHouse(listing)
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
