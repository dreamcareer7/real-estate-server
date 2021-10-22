const db = require('../../../utils/db')

/** @typedef {import('./types').SuperCampaignStored} SuperCampaignStored */

/** @returns {Promise<SuperCampaignStored['id'][]>} */
async function getDue () {
  return db.selectIds('email/super_campaign/due')
}

async function sendDue () {
  const dueIds = await getDue()

  // eslint-disable-next-line no-unused-vars
  for (const id of dueIds) {
    throw new Error('Not implemented')
  }
}

module.exports = {
  getDue,
  sendDue,
}
