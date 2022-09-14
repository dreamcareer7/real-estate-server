const db = require('../../../../../utils/db')
const { expect } = require('../../../../../utils/validator')

/**
 * @param {UUID} contact - contact id
 * @param {string} json - raw json
 * @returns {Promise<>}
 */

const upsertZillowJson = async (contact, json) => {
  expect(contact).to.be.uuid
  expect(json).to.be.string
  
  return db.update('zillow_contact/upsert', [contact, json])
}

module.exports = { upsertZillowJson }
