const db = require('../../../../utils/db')

/** @typedef {import('../types').SuperCampaignStored} SuperCampaignStored */

/**
 * @param {Object} args
 * @param {IBrand['id']} args.brandId
 * @param {IUser['id']} args.userId
 * @param {SuperCampaignStored['id']} args.superCampaignId
 */ 
async function deleteBy ({ brandId, userId, superCampaignId }) {
  db.update(
    'email/super_campaign/enrollment/delete_by',
    [brandId, userId, superCampaignId]
  )
}

module.exports = { deleteBy }
