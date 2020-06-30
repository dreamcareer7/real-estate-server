const promisify = require('../../utils/promisify')
const Deal = require('./index')
const Brand = require('../Brand')
const Socket = require('../Socket')

Deal.CREATED = 'Created'
Deal.UPDATED = 'Updated'
Deal.DELETED = 'Deleted'

Deal.notify = async ({deal, action = Deal.UPDATED}) => {
  const parents = await Brand.getParents(deal.brand)

  for(const brand of parents) {
    Socket.send('Deal', brand, [
      {
        action,
        deal: deal.id
      }
    ])
  }
}

Deal.notifyById = async (id, action) => {
  const deal = await promisify(Deal.get)(id)

  await Deal.notify({deal, action})

  return deal
}
