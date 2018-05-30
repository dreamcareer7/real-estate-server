const db = require('../../utils/db.js')
const Orm = require('../Orm')
const _ = require('lodash')
const Contact = require('../Contact')

const ContactSearchList = {
  async create(userID, data) {
    return db.insert('/contact_search_list/create', [userID, JSON.stringify(data.filters), data.name, data.isPinned])
  },

  async getAll(ids) {
    return db.query.promise('/contact_search_list/get', [ids])
  },

  async listForUser(userID) {
    const ids = await db.selectIds('/contact_search_list/list_for_user', [userID])
    return ContactSearchList.getAll(ids)
  },

  async update(id, {filters, name, isPinned}) {
    return db.select('/contact_search_list/update', [id, JSON.stringify(filters), name, isPinned])
  },

  async delete(id, userID) {
    return db.select('/contact_search_list/delete', [id])
  },

  async getFilterOptions(userID) {
    const allTags = await Contact.getAllTags(userID)
    const onlyTags = allTags.map(t => t.text)
    const filterOptions = {
      tag: {
        values: onlyTags,
        operator: 'all' 
      }
    }
    return filterOptions
  },

  async checkAccess(userID, id) {
    const ids = _.get(await db.query.promise('/contact_search_list/list_for_user', [userID]),
      'rows', []).map(x => x.id)
    if (!ids.includes(id)) {
      throw Error.Forbidden('Access denied to search filter resource')
    }
  }
}
Orm.register('contact_search_list', 'SearchFilter', ContactSearchList)

module.exports = ContactSearchList