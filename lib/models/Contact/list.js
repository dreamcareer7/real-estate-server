const db = require('../../utils/db.js')
const Orm = require('../Orm')
const _ = require('lodash')

class ContactList {
  static async create(userID, data) {
    return db.insert('/contact/list/create', [userID, JSON.stringify(data.filters), data.name, data.is_pinned || false])
  }

  static async getAll(ids) {
    return db.select('/contact/list/get', [ids])
  }

  static async getForUser(userID) {
    const ids = await db.selectIds('/contact/list/list_for_user', [userID])
    return ContactList.getAll(ids)
  }

  static async update(id, {filters, name, is_pinned}) {
    return db.select('/contact/list/update', [id, JSON.stringify(filters), name, is_pinned])
  }

  static async delete(id, userID) {
    return db.update('/contact/list/delete', [id])
  }

  static async checkAccess(userID, id) {
    const ids = _.get(await db.query.promise('/contact/list/list_for_user', [userID]),
      'rows', []).map(x => x.id)
    if (!ids.includes(id)) {
      throw Error.Forbidden('Access denied to search filter resource')
    }
  }

  publicize(model) {
    if (Array.isArray(model.filters)) {
      for (const f of model.filters) {
        f.type = 'contact_list_filter'
      }
    }
  }
}

Orm.register('contact_list', 'ContactList', ContactList)

module.exports = ContactList