const db = require('../../utils/db.js')


/**
 * @param {UUID} id users_jobs unique id
 */
const deletebyId = async (id) => {
  return db.update('users_job/delete', [id])
}


module.exports = {
  deletebyId
}