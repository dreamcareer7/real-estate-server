const db = require('../../../utils/db')

/**
 * @param {UUID} showing_id 
 * @param {string} title 
 */
async function updateTitle(showing_id, title) {
  return db.update('showing/showing/update_title', [ showing_id, title ])
}

module.exports = {
  updateTitle,
}
