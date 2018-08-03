const _ = require('lodash')

const db = require('../../utils/db')
const Orm = require('../Orm')

class ContactDuplicate {
  async fetch(query) {
    /** @type {UUID[][]} */
    const rows = (await db.select(query, Array.from(arguments).slice(1))).map(r => [r.a, r.b])

    /** @type {UUID[][]} */
    let clusters = []

    while (rows.length > 0) {
      /** @type {UUID[]} */
      const pair = rows.pop()
      const [common, distinct] = _.partition(clusters, c => c.includes(pair[0]) || c.includes(pair[1]))
      const merged = _.uniq(common.reduce((c, p) => c.concat(p), pair))

      clusters = [...distinct, merged]
    }

    return clusters.map(cl => ({
      contacts: cl,
      id: cl[0],
      type: 'contact_duplicate'
    }))
  }

  /**
   * Finds merge suggestions for a user
   * @param {UUID} user_id 
   */
  async findForUser(user_id) {
    return this.fetch('contact/duplicate/for_user', user_id)
  }

  /**
   * Finds merge suggestions for a contact
   * @param {UUID} user_id 
   */
  async findForContact(user_id, contact_id) {
    return this.fetch('contact/duplicate/for_contact', user_id, contact_id)
  }
}

ContactDuplicate.prototype.associations = {
  contacts: {
    model: 'Contact',
    collection: true
  }
}

const Model = new ContactDuplicate

Orm.register('contact_duplicate', 'ContactDuplicate', Model)

module.exports = Model