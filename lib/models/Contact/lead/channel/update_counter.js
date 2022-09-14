const db = require('../../../../utils/db')
const { expect } = require('../../../../utils/validator')

/**
 * update lead channel
 * @param {UUID} id - channel id
 * @returns {Promise<>}
 */

const updateCounter = async (id) => {
  expect(id).to.be.uuid
  // I didn't validate ID here because we call this method in Peanar jobs. 
  // so this method is not public from controller 
  return db.update('contact/lead/channel/update_counter', [id])
}

module.exports = { updateCounter }
