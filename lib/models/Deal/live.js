const promisify = require('../../utils/promisify')
const Brand = require('../Brand')
const Socket = require('../Socket')

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
