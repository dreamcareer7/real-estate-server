const db = require('../utils/db.js')
const promisify = require('util').promisify

const SearchFilter = {}
global.SearchFilter = global.SearchFilter || SearchFilter

SearchFilter.create = async function(userID, data) {
  return promisify(db.query)('/search_filter/create', [userID, JSON.stringify(data.filters) , data.name, data.isPinned])
}

SearchFilter.ListForUser = async function (userID) {
  return promisify(db.query)('/search_filter/list_for_user', [userID])
}

SearchFilter.update = async function(id, userID, data) {
  return promisify(db.query)('/search_filter/update', [id, userID, JSON.stringify(data.filters) , data.name, data.isPinned])
}

SearchFilter.remove = async function(id, userID) {
  return promisify(db.query)('/search_filter/remove', [id, userID])
}

module.exports = SearchFilter