const db = require('../../utils/db')

/**
 * @param {UUID[]} listing_ids 
 * @param {IAgent} agent 
 */
async function access(listing_ids, agent) {
  return db.selectIds('listing/access', [
    listing_ids,
    agent.mls
  ])
}

module.exports = { access }
