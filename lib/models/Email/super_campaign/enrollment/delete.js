const { strict: assert } = require('assert')
const db = require('../../../../utils/db')

/** @typedef {import('../types').SuperCampaignStored} SuperCampaignStored */

/**
 * @param {Object} args
 * @param {IBrand['id']=} [args.brandId]
 * @param {IUser['id']=} [args.userId]
 * @param {SuperCampaignStored['id']=} [args.superCampaignId]
 */ 
async function deleteBy ({
  brandId,
  userId,
  superCampaignId,
}) {
  assert(brandId || userId || superCampaignId, 'At least one of arguments must be truthy')
  db.update(
    'email/super_campaign/enrollment/delete_by',
    [brandId, userId, superCampaignId]
  )
}

module.exports = { deleteBy }
