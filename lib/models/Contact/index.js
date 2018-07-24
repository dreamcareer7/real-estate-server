const _ = require('lodash')
const { EventEmitter } = require('events')

const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')
const expect = validator.expect
const promisify = require('../../utils/promisify.js')
const squel = require('../../utils/squel_extensions')

const Orm = require('../Orm')

const ContactAttribute = require('./attribute')
const AttributeDef = require('./attribute_def')

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
   * Performs access control for the user on a number of contact ids
   * @param {UUID} user_id User id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} contact_ids Contact ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  async hasAccess(user_id, op, contact_ids) {
    expect(contact_ids).to.be.an('array')

    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('contact/has_access', [
      Array.from(new Set(contact_ids)),
      user_id
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
   * @param {UUID} user_id 
   * @param {IContactAttributeFilter[]} attribute_filters 
   * @param {(IContactFilterOptions & PaginationOptions)=} options 
   */
  async getForUser(user_id, attribute_filters, options) {
    const filter_res = await this.filter(user_id, attribute_filters, options)
    const rows = await this.getAll(Array.from(filter_res.ids))

    if (rows.length === 0) return []

    rows[0].total = filter_res.total
    return rows
  }

  /**
   * Central filtering function for contacts. Every kind of filtering
   *  is possible here
   * @param {UUID | undefined} user_id User id requesting filter
   * @param {IContactAttributeFilter[]} attribute_filters
   * @param {IContactFilterOptions & PaginationOptions | undefined} options
   */
  async filter(user_id, attribute_filters = [], options = {}) {
    const q = await contactFilterQuery(user_id, attribute_filters, options)
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
   * @param {UUID} user_id Owner of the contacts
   * @param {IContactInput[]} contacts Array of contacts data
   * @param {IAddContactOptions} options Options to tune the behavior for performance
   * @returns {Promise<UUID[]>}
   */
  async create(user_id, contacts, options = {}) {
    options = Object.assign(
      {
        activity: true,
        get: true,
        relax: false
      },
      options
    )

    await this.validate(contacts)
    const contact_ids = await createContacts(user_id, contacts)
    await createContactAttributes(user_id, contact_ids, contacts)

    if (options.activity !== false) {
      await createActivityForContacts(contact_ids)
    }

    this.emit('create', contact_ids)

    return contact_ids
  }

  async delete(ids) {
    const result = await db.update('contact/delete', [ids])

    this.emit('delete', ids)

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
  async update(user_id, contacts) {
    if (!Array.isArray(contacts) || contacts.length < 1) return []

    await this.validate(contacts)

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

    const affected_add = await ContactAttribute.create(toAdd, user_id)
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

    this.emit('update', affected_contacts)

    return affected_contacts
  }

  async merge(user_id, contact_ids, parent_id) {
    if (!Array.isArray(contact_ids) || contact_ids.length < 1) return []

    await db.update('contact/merge', [parent_id, contact_ids])
    await db.update('contact/update_display_names', [[parent_id]])
  }

  /**
   * Check if a peer is connected to a user on address book
   * @param {UUID} user_id
   * @param {UUID} peer_id
   * @returns {Promise<boolean>}
   */
  async isConnected(user_id, peer_id) {
    const row = await db.selectOne('contact/connected', [user_id, peer_id])

    return row.is_connected
  }

  /**
   * Connect two users in their address books
   * @param {UUID} user_id
   * @param {UUID} peer_id
   */
  async connect(user_id, peer_id, override) {
    await this.join(user_id, peer_id, override)
    await this.join(peer_id, user_id, override)
  }

  /**
   * Creates contact from peer user data for user_id
   * @param {UUID} user_id
   * @param {UUID} peer_id
   * @param {Object} override
   */
  async join(user_id, peer_id, override) {
    const connected = await this.isConnected(user_id, peer_id)

    if (connected) return

    const peer = await promisify(User.get)(peer_id)
    const contact = await this.convertUser(
      peer,
      Object.assign({ user_id }, override)
    )

    return this.create(user_id, [contact])
  }

  /**
   * Creates a contact object from a user instance
   * @param {IUser} user
   * @param {Object} override
   * @returns {Promise<IContactInput>}
   */
  async convertUser(user, override) {
    const def_ids = await AttributeDef.getGlobalDefs()
    const defs = await AttributeDef.getAll(def_ids)
    /** @type {Record<string, IContactAttributeDef>} */
    const defs_by_name = _.keyBy(defs, 'name')

    /** @type {IContactAttributeInput[]} */
    const attributes = []

    if (override) expect(override).to.be.a('object')

    if (!_.isEmpty(user.email) && !user.fake_email) {
      attributes.push({
        attribute_def: defs_by_name['email'].id,
        text: user.email
      })
    }

    for (const attr of [
      'phone_number',
      'first_name',
      'last_name',
      'profile_image_url',
      'cover_image_url'
    ]) {
      if (!_.isEmpty(user[attr])) {
        attributes.push({
          attribute_def: defs_by_name[attr].id,
          text: user[attr]
        })
      }
    }

    attributes.push({
      attribute_def: defs_by_name['source_type'].id,
      text:
        override && override.source_type ? override.source_type : 'SharesRoom'
    })

    return {
      attributes
    }
  }

  async getAllTags(user_id) {
    const rows = await db.select('contact/get_tags', [user_id])

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
