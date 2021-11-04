const { strict: assert } = require('assert')
const db = require('../../../../utils/db')

/** @typedef {import('../types').SuperCampaignStored} SuperCampaignStored */

/**
 * @callback DeleteBy
 * @param {Object} args
 * @param {IBrand['id']=} [args.brandId]
 * @param {IUser['id']=} [args.userId]
 * @param {SuperCampaignStored['id']=} [args.superCampaignId]
 * @param {boolean=} [args.detached]
 * @returns {Promise<number>}
 */

/** @type {DeleteBy} */
async function deleteBy (args) {
  assert(Object.keys(args).length, 'At least one of arguments must be present')
  return db.update(
    'email/super_campaign/enrollment/delete_by',
    [args.brandId, args.userId, args.superCampaignId, args.detached]
  )
}

/** @type {DeleteBy} */
async function hardDeleteBy (args) {
  assert(Object.keys(args).length, 'At least one of arguments must be present')
  return db.update(
    'email/super_campaign/enrollment/hard_delete_by',
    [args.brandId, args.userId, args.superCampaignId, args.detached]
  )
}

module.exports = { deleteBy, hardDeleteBy }
