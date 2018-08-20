const _ = require('lodash')
const { EventEmitter } = require('events')

const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')
const expect = validator.expect
const squel = require('../../utils/squel_extensions')

const Orm = require('../Orm')

const ContactAttribute = require('./attribute')

const contactFilterQuery = require('./filter')

require('./sub_contact')
require('./summary')

const {
  createContacts,
  createContactAttributes,
  createActivityForContacts
} = require('./create')

const schema = require('./schemas').contact
const validate = validator.promise.bind(null, schema)

class ContactClass extends EventEmitter {
  constructor() {
    super()

    this.associations = {
      sub_contacts: {
        collection: true,
        enabled: false,
        model: 'SubContact'
      },
      summary: {
        model: 'ContactSummary',
        enabled: false
      },
      lists: {
        model: 'ContactList',
        enabled: false,
        collection: true
      }
    }
  }

  async validate(contacts) {
    for (const contact of contacts) {
      await validate(contact)
    }
  }

  /**
   * Performs access control for the brand on a number of contact ids
   * @param {UUID} brand_id Brand id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} contact_ids Contact ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  async hasAccess(brand_id, op, contact_ids) {
    expect(contact_ids).to.be.an('array')

    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('contact/has_access', [
      Array.from(new Set(contact_ids)),
      brand_id
    ])

    const foundIndex = _.keyBy(rows, 'id')

    const accessIndex = contact_ids.reduce((index, tid) => {
      return index.set(
        tid,
        foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
      )
    }, new Map())

    return accessIndex
  }

  /**
   * Get a list of users who can access contacts
   * @param {UUID[]} contact_ids 
   * @returns {Promise<UUID[]>}
   */
  authorizedUsers(contact_ids) {
    return db.selectIds('contact/authorized_users', [
      contact_ids
    ])
  }

  async get(id) {
    const result = await this.getAll([id])

    if (!Array.isArray(result) || result.length < 1)
      throw Error.ResourceNotFound(`Contact ${id} not found`)

    return result[0]
  }

  /**
   * Get contacts by id
   * @param {UUID[]} ids 
   * @param {UUID=} user_id 
   * @returns {Promise<IParentContact[]>}
   */
  async getAll(ids, user_id = undefined) {
    const contacts = await db.select('contact/get', [ids])
    
    return contacts
  }

  /**
   * 
   * @param {UUID} brand_id 
   * @param {IContactAttributeFilter[]} attribute_filters 
   * @param {(IContactFilterOptions & PaginationOptions)=} options 
   */
  async getForBrand(brand_id, attribute_filters, options) {
    const filter_res = await this.filter(brand_id, attribute_filters, options)
    const rows = await this.getAll(Array.from(filter_res.ids))

    if (rows.length === 0) return []

    rows[0].total = filter_res.total
    return rows
  }

  /**
   * Central filtering function for contacts. Every kind of filtering
   *  is possible here
   * @param {UUID | undefined} brand_id Brand id of the user who's requesting filter
   * @param {IContactAttributeFilter[]} attribute_filters
   * @param {IContactFilterOptions & PaginationOptions | undefined} options
   */
  async filter(brand_id, attribute_filters = [], options = {}) {
    const q = await contactFilterQuery(brand_id, attribute_filters, options)
    q.name = 'contact/filter'

    const rows = await db.select(q)

    if (rows.length === 0) {
      return {
        ids: new Set(),
        total: 0
      }
    }

    // We need to unique merged contacts by parent id,
    // so that a parent with two sub-contacts doesn't appear twice.
    const [merged_contacts, parent_contacts] = _.partition(rows, 'parent')
    return {
      ids: new Set(_.uniqBy(merged_contacts, 'parent').concat(parent_contacts).map(r => r.id)),
      total: rows[0].total
    }
  }

  /**
   * Create multiple contacts in bulk with performance in mind
   * @param {IContactInput[]} contacts Array of contacts data
   * @param {UUID} user_id Creator of the contacts
   * @param {UUID} brand_id Owner of the contacts
   * @param {IAddContactOptions} options Options to tune the behavior for performance
   * @returns {Promise<UUID[]>}
   */
  async create(contacts, user_id, brand_id, options = {}) {
    options = Object.assign(
      {
        activity: true,
        get: true,
        relax: false
      },
      options
    )

    await this.validate(contacts)
    const contact_ids = await createContacts(contacts, user_id, brand_id)
    await createContactAttributes(user_id, brand_id, contact_ids, contacts)

    if (options.activity !== false) {
      await createActivityForContacts(contact_ids)
    }

    this.emit('create', {
      user_id,
      contact_ids
    })

    return contact_ids
  }

  async delete(ids) {
    const result = await db.update('contact/delete', [ids])

    this.emit('delete', {
      contact_ids: ids,
      event_type: 'delete'
    })

    return result
  }

  deleteOne(id) {
    return this.delete([id])
  }

  /**
   * Updates a contact with attributes
   * @param {IContactInput[]} contacts
   * @returns {Promise<UUID[]>}
   */
  async update(user_id, brand_id, contacts) {
    if (!Array.isArray(contacts) || contacts.length < 1) return []

    await this.validate(contacts)

    /** @type {IContactAttribute[]} */
    const toAdd = [],
      toUpdate = []

    const toUpdateIOS = []

    for (const contact of contacts) {
      if (contact.hasOwnProperty('ios_address_book_id')) {
        toUpdateIOS.push(_.pick(contact, ['id', 'ios_address_book_id']))
      }

      if (Array.isArray(contact.attributes)) {
        for (const attr of contact.attributes) {
          if (attr.id) {
            toUpdate.push({
              ...attr,
              contact: contact.id
            })
          } else {
            toAdd.push({
              ...attr,
              contact: contact.id,
              created_by: user_id
            })
          }
        }
      }
    }

    const affected_add = await ContactAttribute.create(toAdd, brand_id, user_id)
    const affected_update = await ContactAttribute.update(toUpdate)
    const affected_contacts = _.uniq(Array.from(affected_add).concat(Array.from(affected_update)))

    if (toUpdateIOS.length > 0) {
      const q = squel
        .update()
        .withValues('update_values', toUpdateIOS)
        .table('contacts')
        .set('ios_address_book_id = uv.ios_address_book_id')
        .from('update_values', 'uv')
        .where('contacts.id = uv.id::uuid')
        .returning('contacts.id')

      q.name = 'contact/update'

      await db.selectIds(q)
    }

    this.emit('update', {
      user_id,
      contact_ids: affected_contacts,
      event_type: 'update'
    })

    return affected_contacts
  }

  /**
   * Merges a number of contacts into a parent contact
   * @param {UUID} user_id 
   * @param {UUID[]} contact_ids 
   * @param {UUID} parent_id 
   */
  async merge(user_id, contact_ids, parent_id) {
    if (!Array.isArray(contact_ids) || contact_ids.length < 1) return []

    const deleted_contacts = await db.selectIds('contact/merge', [parent_id, contact_ids])

    this.emit('update', {
      user_id,
      contact_ids: [parent_id],
      event_type: 'merge'
    })

    this.emit('delete', {
      user_id,
      contact_ids: deleted_contacts,
      event_type: 'merge'
    })

    await db.update('contact/update_display_names', [[parent_id]])

    return deleted_contacts
  }

  async getAllTags(brand_id) {
    const rows = await db.select('contact/get_tags', [brand_id])

    return _.uniqBy(rows, 'text')
  }

  /**
   * Fetches a contact's timeline of activities
   * @param {UUID} contact_id
   */
  async contactTimeline(contact_id, query) {
    expect(contact_id).to.be.uuid

    const results = await db.select('contact/timeline', [
      contact_id,
      query.timestamp_lte,
      query.limit
    ])

    const idIndex = _.groupBy(results, 'type')
    const fullIndex = {}

    for (const type in idIndex) {
      const model = Orm.getModelFromType(type)
      const ids = idIndex[type].map(x => x.id)

      const models = await Orm.getAll(model, ids)
      fullIndex[type] = _.keyBy(models, 'id')
    }

    const timeline = results.map(row => fullIndex[row.type][row.id])

    if (results.length > 0) {
      timeline[0].total = results[0].total
    }

    return timeline
  }
}

const Contact = new ContactClass

Orm.register('contact', 'Contact', Contact)

module.exports = Contact
