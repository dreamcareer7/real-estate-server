const { strict: assert } = require('assert')
const db = require('../../../../utils/db')

/** @typedef {import('../types').SuperCampaignStored} SuperCampaignStored */
/** @typedef {import('../types').SuperCampaignEnrollmentCause} SuperCampaignEnrollmentCause */

/**
 * @param {Object} args
 * @param {IBrand['id']=} [args.brandId]
 * @param {IUser['id']=} [args.userId]
 * @param {SuperCampaignStored['id']=} [args.superCampaignId]
 * @param {SuperCampaignEnrollmentCause=} [args.cause]
 * @returns {Promise<number>}
 */
async function deleteBy (args) {
  assert(Object.keys(args).length, 'At least one of arguments must be present')
  return db.update(
    'email/super_campaign/enrollment/delete_by',
    [args.brandId, args.userId, args.superCampaignId, args.cause],
  )
}

/**
 * @param {Object} args
 * @param {IBrand['id']=} [args.brandId]
 * @param {IUser['id']=} [args.userId]
 * @param {SuperCampaignStored['id']=} [args.superCampaignId]
 * @param {SuperCampaignEnrollmentCause=} [args.cause]
 * @param {boolean=} [args.optedOut]
 * @returns {Promise<number>}
 */
async function hardDeleteBy (args) {
  assert(Object.keys(args).length, 'At least one of arguments must be present')
  return db.update(
    'email/super_campaign/enrollment/hard_delete_by',
    [args.brandId, args.userId, args.superCampaignId, args.cause, args.optedOut],
  )
}

module.exports = { deleteBy, hardDeleteBy }
