const db = require('../../../utils/db')
const { execute } = require('./execute')

/** @typedef {import('./types').SuperCampaignStored} SuperCampaignStored */

/** @returns {Promise<SuperCampaignStored['id'][]>} */
async function getDue () {
  return db.selectIds('email/super_campaign/due')
}

async function executeDue () {
  const dueIds = await getDue()

  for (const id of dueIds) {
    await execute(id)
  }
}

module.exports = {
  getDue,
  executeDue,
}
