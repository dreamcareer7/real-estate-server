const promisify = require('../../utils/promisify')

Deal.CREATED = 'Created'
Deal.UPDATED = 'Updated'
Deal.DELETED = 'Deleted'

Deal.notify = async ({deal, action = Deal.UPDATED}) => {
  const parents = await Brand.getParents(deal.brand)

  const populated = await Orm.populate({
    models: [deal],
    associations: [
      'room.attachments',
      'deal.checklists',
      'deal.envelopes',
      'deal.brand',
      'deal.created_by',
      'deal.files'
    ]
  })

  for(const brand of parents) {
    Socket.send('Deal', brand, [
      {
        action,
        deal: populated[0]
      }
    ])
  }
}

Deal.notifyById = async (id, action) => {
  const deal = await promisify(Deal.get)(id)

  await Deal.notify({deal, action})

  return deal
}