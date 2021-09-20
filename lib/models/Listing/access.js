const db = require('../../utils/db')

/**
 * @param {UUID[]} listing_ids 
 * @param {UUID} agent 
 */
async function access(listing_ids, agent) {
  console.log(agent)
  return db.selectIds('listing/access', [
    listing_ids,
    agent
  ])
}

module.exports = { access }
