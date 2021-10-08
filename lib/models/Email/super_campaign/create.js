const db = require('../../../utils/db')

const Recipient = require('./recipient/create')

/**
 * @param {import('./types').SuperCampaignInput} data 
 * @returns {Promise<UUID>}
 */
async function insert(data) {
  return db.insert('email/super_campaign/insert', [
    data.created_by,
    data.brand,
    data.subject,
    data.template_instance
  ])
}

/**
 * @param {import('./types').SuperCampaignApiInput} data 
 * @param {UUID} user
 * @param {UUID} brand
 * @returns {Promise<UUID>}
 */
async function create(data, user, brand) {
  try {
    const id = await insert({ ...data, created_by: user, brand })
    await Recipient.create(id, data.recipients)
    return id
  } catch (ex) {
    throw ex
  }
}

module.exports = {
  create,
}
