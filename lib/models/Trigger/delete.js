const db = require('../../utils/db')
const Context = require('../Context/index')

/**
 * @param {UUID} id 
 */
async function deleteTrigger(id) {
  return db.update('trigger/delete', [ id, Context.getId() ])
}

module.exports = {
  delete: deleteTrigger
}
