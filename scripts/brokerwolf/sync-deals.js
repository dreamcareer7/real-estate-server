require('../connection.js')
require('../../lib/models/index.js')
const db = require('../../lib/utils/db')
const promisify = require('../../lib/utils/promisify')

const run = async () => {
  const query = 'SELECT id FROM deals WHERE brokerwolf_id IS NULL AND deleted_at IS NULL'
  const { rows } = await db.executeSql.promise(query)
  const deal_ids = rows.map(row => row.id)
  Context.log('Found', deal_ids.lenth)

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
