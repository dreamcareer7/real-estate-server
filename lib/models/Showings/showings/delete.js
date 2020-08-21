const db = require('../../../utils/db.js')


const deleteByShowingId = async (showingId) => {
  await db.query.promise('showing/delete', [showingId])
}


module.exports = {
  delete: deleteByShowingId
}