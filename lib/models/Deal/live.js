const promisify = require('../../utils/promisify')
const Brand = require('../Brand/get')
const Socket = require('../Socket')
const BrandWebhook = require('../Brand/webhook/trigger')

const D365 = require('./D365')
const MoveEasy = require('./MoveEasy')
const BrokerWolf = require('./brokerwolf')

const CREATED = 'Created'
const UPDATED = 'Updated'
const DELETED = 'Deleted'

const { get } = require('./get')

const notify = async ({deal, action = UPDATED}) => {
  const parents = await Brand.getParents(deal.brand)

  for(const brand of parents) {
    Socket.send('Deal', brand, [
      {
        action,
        deal: deal.id
      }
    ])
  }

  await BrokerWolf.considerSync(deal)
  await D365.considerSync(deal, parents)
  await MoveEasy.considerSync(deal)

  await BrandWebhook.trigger({
    topic: 'Deals',
    event: action,
    payload: { deal },
    brand: deal.brand
  })
}

const notifyById = async (id, action) => {
  const deal = await promisify(get)(id)

  await notify({deal, action})

  return deal
}

module.exports = {
  CREATED,
  UPDATED,
  DELETED,

  notify,
  notifyById
}
