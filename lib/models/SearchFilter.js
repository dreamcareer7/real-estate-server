const db = require('../utils/db.js')
const promisify = require('util').promisify
const Orm = require('./Orm')
const _ = require('lodash')

const SearchFilter = {
  async create(userID, data) {
    return db.insert('/search_filter/create', [userID, JSON.stringify(data.filters), data.name, data.isPinned])
  },

  async listForUser(userID) {
    const ids = _.get(await db.query.promise('/search_filter/list_for_user', [userID]),
      'rows', []).map(x => x.id)
    return db.query.promise('/search_filter/get', [ids])
  },

  async update(id, userID, data) {
    return db.query.promise('/search_filter/update', [id, userID, JSON.stringify(data.filters), data.name, data.isPinned])
  },

  async remove(id, userID) {
    return db.query.promise('/search_filter/remove', [id, userID])
  },

  async getFilterOptions(userID) {
    const allTags = await promisify(Contact.getAllTags)(userID)
    const onlyTags = allTags.map(t => t.tag)
    const filterOptions = {
      tags: {
        collection: 'contacts',
        property: 'tag',
        type: 'enum',
        values: onlyTags,
        operators: ['matchAll' /*, 'matchAny'*/ ]
      }
    }
    return filterOptions
  }

}
Orm.register('search_filter', 'SearchFilter', SearchFilter)

module.exports = SearchFilter