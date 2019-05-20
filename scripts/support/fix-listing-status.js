const promisify = require('../../lib/utils/promisify')

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

addContext(
  '99754f28-c69b-11e8-83ba-0a95998482ac',
  '99813be4-c69b-11e8-83c9-0a95998482ac',
  '0d7555f0-3f31-11e8-810a-0a95998482ac'
).then(process.exit, process.exit)
