const { get } = require('./get')
const EmailCampaign = require('../campaign/create')

/**
 * @param {UUID} id 
 */
async function execute(id) {
  const super_campaign = await get(id)
}

module.exports = {
  execute
}
