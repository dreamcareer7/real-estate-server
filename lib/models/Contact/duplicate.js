const _ = require('lodash')

const db = require('../../utils/db')
const Orm = require('../Orm')

class ContactDuplicate {
  /**
   * Finds merge suggestions for a user
   * @param {UUID} user_id 
   */
  async getForUser(user_id) {
    /** @type {UUID[][]} */
    const rows = (await db.select('contact/find_similar_contacts', [
      user_id
    ])).map(r => [r.a, r.b])

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