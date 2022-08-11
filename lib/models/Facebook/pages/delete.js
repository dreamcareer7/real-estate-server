const db = require('../../../utils/db.js')

const deleteAccount = (id) => {
  return Promise.all([
    db.selectIds('facebook/facebook_pages/delete', [id]),
    db.selectIds('social_post/delete_by_facebook_page', [id]),
  ]) 
}

module.exports = deleteAccount