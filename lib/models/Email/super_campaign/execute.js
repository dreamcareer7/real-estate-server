// const { get } = require('./get')
// const EmailCampaign = require('../campaign/create')

/**
 * @param {UUID} id 
 */
async function execute(id) {
  // const super_campaign = await get(id)
  /**
   * 1. Get all enrollment records
   * 2. Create an `individual` email campaign for each enrollment with its tags and brand and from = enrollment.user
   */
}

module.exports = {
  execute
}
