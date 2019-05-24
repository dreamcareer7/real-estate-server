const promisify = require('../../lib/utils/promisify')
const { runInContext } = require('../../lib/models/Context/util')

async function addContext(deal_id, checklist_id, user_id) {
  await Deal.saveContext({
    deal: deal_id,
    user: user_id,
    context: [
      {
        value: 'Cancelled',
        approved: true,
        checklist: checklist_id,
        definition: '2aaedcce-2e80-11e9-a642-0a95998482ac'
      }
    ]
  })

  const updated = await promisify(Deal.get)(deal_id)
  const deal = await Deal.updateTitle(updated)

  await Deal.BrokerWolf.considerSync(deal)

  await Deal.notify({ deal })
}

runInContext('listing_status', async () => {
  await addContext(
    '92968934-57e5-11e9-9c0b-0a95998482ac',
    '99813be4-c69b-11e8-83c9-0a95998482ac',
    'dfaca168-2f6e-11e8-a108-0a95998482ac'
  )
}).then(process.exit, process.exit)
