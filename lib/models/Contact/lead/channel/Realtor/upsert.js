const db = require('../../../../../utils/db')
const { expect } = require('../../../../../utils/validator')

/**
 * @param {UUID} contact - contact id
 * @param {string} json - raw json
 * @returns {Promise<>}
 */

const upsertRealtorJson = async (contact, json) => {
  expect(contact).to.be.uuid
  expect(json).to.be.string
  
  return db.update('contact/lead/realtor/upsert', [contact, json])
}

module.exports = { upsertRealtorJson }
