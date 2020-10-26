const db = require('../../../utils/db.js')

/**
 * stores raw xml LTS payload
 * @param {UUID} user 
 * @param {UUID} brand 
 * @param {string} payload 
 */
async function save(user, brand, payload) {
  return db.insert('contact/lead/save', [
    brand,
    user,
    payload
  ])
}

module.exports = {
  save
}
