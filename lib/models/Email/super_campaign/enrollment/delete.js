const { strict: assert } = require('assert')
const db = require('../../../../utils/db')

/** @typedef {import('../types').SuperCampaignStored} SuperCampaignStored */

/**
 * @param {Object} args
 * @param {IBrand['id']=} [args.brandId]
 * @param {IUser['id']=} [args.userId]
 * @param {SuperCampaignStored['id']=} [args.superCampaignId]
 * @param {boolean=} [args.detached]
 */ 
async function deleteBy (args) {
  assert(Object.keys(args).length, 'At least one of arguments must be truthy')
  db.update(
    'email/super_campaign/enrollment/delete_by',
    [args.brandId, args.userId, args.superCampaignId, args.detached]
  )
}

module.exports = { deleteBy }
