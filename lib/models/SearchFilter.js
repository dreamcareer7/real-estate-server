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

  async update(id, {filters, name, isPinned}) {
    return db.query.promise('/search_filter/update', [id, JSON.stringify(filters), name, isPinned])
  },

  async delete(id, userID) {
    return db.query.promise('/search_filter/delete', [id])
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
  },

  async checkAccess(userID, id) {
    const ids = _.get(await db.query.promise('/search_filter/list_for_user', [userID]),
      'rows', []).map(x => x.id)
    if (!ids.includes(id)) {
      throw Error.Forbidden('Access denied to search filter resource')
    }
  }
}
Orm.register('search_filter', 'SearchFilter', SearchFilter)

module.exports = SearchFilter