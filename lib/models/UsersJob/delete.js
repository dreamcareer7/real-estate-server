const db = require('../../utils/db.js')


/**
 * @param {UUID} id users_jobs unique id
 */
const deleteById = async (id) => {
  return db.update('users_job/delete', [id])
}

const restoreById = async (id) => {
  return db.update('users_job/restore', [id])
}


module.exports = {
  deleteById,
  restoreById
}