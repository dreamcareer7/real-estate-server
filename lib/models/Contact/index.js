const _ = require('lodash')

const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')
const expect = validator.expect
const squel = require('../../utils/squel_extensions')

const Orm = require('../Orm')
const ContactAttribute = require('./attribute')

require('./sub_contact')
require('./summary')

const {
  createContacts,
  createContactAttributes,
  createActivityForContacts
} = require('./create')

const schema = require('./schemas').contact
const validate = validator.promise.bind(null, schema)

class Contact {
  static async validate(contacts) {
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
  static async hasAccess(brand_id, op, contact_ids) {
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

  static async get(id) {
    const result = await Contact.getAll([id])

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
  static async getAll(ids, user_id = undefined) {
    const contacts = await db.select('contact/get', [ids])
    
    return contacts
  }

  static async getForBrand(brand_id, attribute_filters, options) {
    const filter_res = await Contact.filter(brand_id, attribute_filters, options)
    const rows = await Contact.getAll(Array.from(filter_res.ids))

    if (rows.length === 0) return []

    rows[0].total = filter_res.total
    return rows
  }

  /**
   *
   * @param {UUID | undefined} brand_id Brand id of the user who's requesting filter
   * @param {IContactAttributeFilter[]} attribute_filters
   * @param {IContactFilterOptions & PaginationOptions} options
   */
  static async filter(brand_id, attribute_filters = [], options = {}) {
    if (!options) options = {}
    const terms = options.q

    const q = squel
      .select()
      .field('id')
      .field('parent')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('contacts')

    if (Array.isArray(terms)) {
      for (const term of terms) {
        q.where('searchable_field ILIKE ?', '%' + term + '%')
      }
    }

    q.where('deleted_at IS NULL')

    q.name = 'contact/filter'

    if (attribute_filters && !Array.isArray(attribute_filters))
      console.warn('[Contact.filter] attribute_filters should be an array.')

    if (brand_id)
      q.where('check_contact_read_access(contacts, ?)', brand_id)

    if (Array.isArray(attribute_filters) && attribute_filters.length > 0) {
      q.where(
        'id = ANY(?)',
        await ContactAttribute.filterQuery(attribute_filters)
      )
    }

    if (options.updated_gte)
      q.where('updated_at >= to_timestamp(?)', options.updated_gte)

    if (options.updated_lte)
      q.where('updated_at <= to_timestamp(?)', options.updated_lte)

    if (options.order) {
      if ('+-'.indexOf(options.order[0]) > -1) {
        q.order(options.order.substring(1), options.order[0] !== '-')
      } else {
        q.order(options.order)
      }
    }

    if (options.start) q.offset(options.start)
    if (options.limit) q.limit(options.limit)

    const rows = await db.select(q)

    if (rows.length === 0) {
      return {
        ids: [],
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
  static async create(contacts, user_id, brand_id, options = {}) {
    options = Object.assign(
      {
        activity: true,
        get: true,
        relax: false
      },
      options
    )

    await Contact.validate(contacts)
    const contact_ids = await createContacts(contacts, user_id, brand_id)
    await createContactAttributes(user_id, brand_id, contact_ids, contacts)

    if (options.activity !== false) {
      await createActivityForContacts(contact_ids)
    }

    return contact_ids
  }

  static delete(ids) {
    return db.update('contact/delete', [ids])
  }

  static deleteOne(id) {
    return Contact.delete([id])
  }

  /**
   * Updates a contact with attributes
   * @param {IContact[]} contacts
   * @returns {Promise<UUID[]>}
   */
  static async update(user_id, brand_id, contacts) {
    if (!Array.isArray(contacts) || contacts.length < 1) return []

    await Contact.validate(contacts)

    /** @type {IContactAttribute[]} */
    const toAdd = [],
      toUpdate = []

    for (const contact of contacts) {
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

    await ContactAttribute.create(toAdd, brand_id)
    await ContactAttribute.update(toUpdate)

    const fieldsArray = contacts.map(contact => ({
      id: contact.id,
      ios_address_book_id: contact.ios_address_book_id || null,
      android_address_book_id: contact.android_address_book_id || null
    }))

    const q = squel
      .update()
      .withValues('update_values', fieldsArray)
      .table('contacts')
      .set('ios_address_book_id = uv.ios_address_book_id')
      .set('android_address_book_id = uv.android_address_book_id')
      .from('update_values', 'uv')
      .where('contacts.id = uv.id::uuid')
      .returning('contacts.id')

    q.name = 'contact/update'

    return db.selectIds(q)
  }

  static merge(user_id, contact_ids, parent_id) {
    if (!Array.isArray(contact_ids) || contact_ids.length < 1) return []

    return db.update('contact/merge', [contact_ids, parent_id])
  }

  static async getAllTags(brand_id) {
    const rows = await db.select('contact/get_tags', [brand_id])

    return _.uniqBy(rows, 'text')
  }

  /**
   * Fetches a contact's timeline of activities
   * @param {UUID} contact_id
   */
  static async contactTimeline(contact_id, query) {
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

Contact.associations = {
  sub_contacts: {
    collection: true,
    enabled: false,
    model: 'SubContact'
  },
  summary: {
    model: 'ContactSummary',
    enabled: false
  }
}

Orm.register('contact', 'Contact', Contact)

module.exports = Contact
