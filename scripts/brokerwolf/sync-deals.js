require('../connection.js')
require('../../lib/models/index.js')
const promisify = require('../../lib/utils/promisify')
const fs = require('fs')

const file = fs.readFileSync(process.argv[2]).toString()

const deal_ids = file.trim().split('\n').map(id => id.trim())

const run = async () => {
  const deals = await promisify(Deal.getAll)(deal_ids)

  let i = 0

  const success = []
  const errors = []

  for(const deal of deals) {
    i++
    console.log(`${i}/${deals.length}`)

    try {
      await Deal.BrokerWolf.sync(deal)
      success.push(deal)
    } catch(error) {
      errors.push({
        deal,
        error
      })
    }
  }


  console.log('\n\n\n\n\n\nSuccessful')

  for(const deal of success) {
    console.log(deal.id, Deal.getContext(deal, 'full_address'))
  }

  console.log('Error')

  for(const pair of errors) {
    const { deal, error } = pair

    console.log(deal.id, Deal.getContext(deal, 'full_address'))
    console.log(error.message)
    console.log('----------------------------')
  }
}


run()