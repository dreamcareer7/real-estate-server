const _ = require('lodash')

const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')
const expect = validator.expect
const promisify = require('../../utils/promisify.js')
const squel = require('../../utils/squel_extensions')

const Orm = require('../Orm')
const ObjectUtil = require('../ObjectUtil')
const ContactAttribute = require('./attribute')
const AttributeDef = require('./attribute_def')

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
   * Performs access control for the user on a number of contact ids
   * @param {UUID} user_id User id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} contact_ids Contact ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  static async hasAccess(user_id, op, contact_ids) {
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
   * Extract most recent version of all fields relevant to name
   * @param {IParentContact} contact parent contact to get name info
   */
  static extractNameInfo(contact) {
    function best_attribute_of_type(attribute_type) {
      const attr = _(contact.sub_contacts)
        .flatMap('attributes')
        .filter(a => a.attribute_type === attribute_type)
        .sortBy('updated_at')
        .reverse()
        .head()

      if (attr) return attr.text
    }

    return {
      title: best_attribute_of_type('title'),
      first_name: best_attribute_of_type('first_name'),
      middle_name: best_attribute_of_type('middle_name'),
      last_name: best_attribute_of_type('last_name'),
      nickname: best_attribute_of_type('nickname'),
      email: best_attribute_of_type('email'),
      phone_number: best_attribute_of_type('phone_number'),
      company: best_attribute_of_type('company')
    }
  }

  static summarize(contact) {
    const info = Contact.extractNameInfo(contact)

    return {
      ...info,
      display_name: Contact.getDisplayName(contact),
      abbreviated_display_name: Contact.getAbbreviatedDisplayName(contact)
    }
  }

  static getDisplayName(contact) {
    const {
      nickname,
      first_name,
      last_name,
      email,
      phone_number,
      company
    } = Contact.extractNameInfo(contact)

    if (!_.isEmpty(first_name) && !_.isEmpty(last_name))
      return first_name + ' ' + last_name

    if (!_.isEmpty(nickname)) return nickname

    if (!_.isEmpty(first_name)) return first_name

    if (!_.isEmpty(last_name)) return last_name

    if (!_.isEmpty(company)) return company

    if (!_.isEmpty(email)) return email

    if (!_.isEmpty(phone_number)) return phone_number

    return 'Guest'
  }

  static getAbbreviatedDisplayName(contact) {
    const {
      nickname,
      first_name,
      email,
      phone_number,
      company
    } = Contact.extractNameInfo(contact)

    if (!_.isEmpty(nickname)) return nickname

    if (!_.isEmpty(first_name)) return first_name

    if (!_.isEmpty(company)) return company

    if (!_.isEmpty(email)) return email

    if (!_.isEmpty(phone_number)) return phone_number

    return 'Guest'
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
   * @param {UUID | undefined} user_id
   * @returns {Promise<IParentContact[]>}
   */
  static async getAll(ids, user_id = undefined) {
    if (!user_id)
      user_id = ObjectUtil.getCurrentUser()

    const contacts = await db.select('contact/get', [ids, user_id])

    const contact_ids = contacts.map(c => c.id)
    const attributes = await ContactAttribute.getForContacts(contact_ids)

    const attributes_by_contact = _.groupBy(attributes, 'contact')

    for (const contact of contacts) {
      contact.attributes = attributes_by_contact[contact.id]
    }

    const contacts_by_parent = _.groupBy(contacts, 'parent')
    return _.map(contacts_by_parent, (sub_contacts, parent_id) => {
      sub_contacts.sort((a, b) => {
        if (a.id === parent_id) return -1
        if (b.id === parent_id) return 1
        return a.created_at - b.created_at
      })

      const created_at = sub_contacts.map(sc => sc.created_at).sort()[0]
      const updated_at = sub_contacts
        .map(sc => sc.updated_at)
        .sort()
        .reverse()[0]
      const deleted_at = sub_contacts[0].deleted_at

      let deals = [], users = []

      for (const sc of sub_contacts) {
        if (Array.isArray(sc.deals)) {
          deals = deals.concat(sc.deals)
          delete sc.deals
        }
        if (Array.isArray(sc.users)) {
          users = users.concat(sc.users)
          delete sc.users
        }
      }

      return {
        id: parent_id,
        created_at,
        updated_at,
        deleted_at,
        sub_contacts,
        deals,
        users,
        summary: Contact.summarize({ sub_contacts }),
        type: 'contact',
        merged: sub_contacts.length > 1
      }
    })
  }

  static async getForUser(user_id, attribute_filters, options) {
    const filter_res = await Contact.filter(user_id, attribute_filters, options)
    const rows = await Contact.getAll(filter_res.ids)

    if (rows.length === 0)
      return []

    rows[0].total = filter_res.total
    return rows
  }

  /**
   * 
   * @param {UUID | undefined} user_id User id requesting filter
   * @param {IContactAttributeFilter[]} attribute_filters 
   * @param {IContactFilterOptions & PaginationOptions} options 
   */
  static async filter(user_id, attribute_filters = [], options = {}) {
    if (!options)
      options = {}

    const q = squel.select()
      .field('id')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('contacts')
      .where('deleted_at IS NULL')
      .where('parent IS NULL')

    if (attribute_filters && !Array.isArray(attribute_filters))
      console.warn('[Contact.filter] attribute_filters should be an array.')

    if (user_id)
      q.where('check_contact_read_access(contacts, ?)', user_id)

    if (Array.isArray(attribute_filters) && attribute_filters.length > 0)
      q.where('id = ANY(?)', await ContactAttribute.filterQuery(attribute_filters))

    if (options.updated_gte)
      q.where('updated_at >= to_timestamp(?)', options.updated_gte)

    if (options.updated_lte)
      q.where('updated_at <= to_timestamp(?)', options.updated_lte)

    if (options.order) {
      if ('+-'.indexOf(options.order[0]) > -1)
        q.order(options.order.substring(1), options.order[0] !== '-')
      else
        q.order(options.order)
    }

    if (options.start)
      q.offset(options.start)

    if (options.limit)
      q.limit(options.limit)

    const buildQuery = q.toParam()
    const res = await promisify(db.executeSql)(buildQuery.text, buildQuery.values)

    if (res.rows.length === 0)
      return {
        ids: [],
        total: 0
      }

    return {
      ids: res.rows.map(r => r.id),
      total: res.rows[0].total
    }
  }

  /**
   * Create multiple contacts in bulk with performance in mind
   * @param {UUID} user_id Owner of the contacts
   * @param {IContactInput[]} contacts Array of contacts data
   * @param {IAddContactOptions} options Options to tune the behavior for performance
   * @returns {Promise<UUID[]>}
   */
  static async create(user_id, contacts, options = {}) {
    options = Object.assign(
      {
        activity: true,
        get: true,
        relax: false
      },
      options
    )

    await Contact.validate(contacts)
    const contact_ids = await createContacts(user_id, contacts)
    await createContactAttributes(user_id, contact_ids, contacts, options.relax)

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
  static async update(user_id, contacts) {
    if (!Array.isArray(contacts) || contacts.length < 1) return []

    await Contact.validate(contacts)

    const toAdd = [], toUpdate = []

    for (const contact of contacts) {
      for (const attr of contact.attributes) {
        attr.contact = contact.id

        if (attr.id) {
          toUpdate.push(attr)
        }
        else {
          attr.created_by = user_id
          toAdd.push(attr)
        }
      }
    }

    await ContactAttribute.create(toAdd)
    await ContactAttribute.update(toUpdate)

    const fieldsArray = contacts.map(contact => ({
      id: contact.id,
      ios_address_book_id: contact.ios_address_book_id || null,
      android_address_book_id: contact.android_address_book_id || null,
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
      .toParam()

    const { rows } = await promisify(db.executeSql)(q.text, q.values)
    return rows.map(row => row.id)
  }

  static merge(user_id, contact_ids, parent_id) {
    if (!Array.isArray(contact_ids) || contact_ids.length < 1) return []

    return db.update('contact/merge', [
      contact_ids,
      parent_id
    ])
  }

  /**
   * Check if a peer is connected to a user on address book
   * @param {UUID} user_id
   * @param {UUID} peer_id
   * @returns {Promise<boolean>}
   */
  static async isConnected(user_id, peer_id) {
    const row = await db.selectOne('contact/connected', [user_id, peer_id])

    return row.is_connected
  }

  /**
   * Connect two users in their address books
   * @param {UUID} user_id
   * @param {UUID} peer_id
   */
  static async connect(user_id, peer_id, override) {
    await Contact.join(user_id, peer_id, override)
    await Contact.join(peer_id, user_id, override)
  }

  /**
   * Creates contact from peer user data for user_id
   * @param {UUID} user_id 
   * @param {UUID} peer_id 
   * @param {Object} override 
   */
  static async join(user_id, peer_id, override) {
    const connected = await Contact.isConnected(user_id, peer_id)

    if (connected) return

    const peer = await promisify(User.get)(peer_id)
    const contact = await Contact.convertUser(
      peer,
      Object.assign({ user_id }, override)
    )

    return Contact.create(user_id, [contact])
  }

  /**
   * Creates a contact object from a user instance
   * @param {IUser} user
   * @param {Object} override
   * @returns {Promise<IContactInput>}
   */
  static async convertUser(user, override) {
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

  static async getAllTags(user_id) {
    const rows = await db.select('contact/get_tags', [user_id])

    return _(rows).map('tag').uniq().value()
  }

  /**
   * Fetches a contact's timeline of activities
   * @param {UUID} contact_id 
   */
  static async contactTimeline(contact_id, pagination) {
    expect(contact_id).to.be.uuid

    const contact = await Contact.get(contact_id)

    const user_refs = contact.users || []
    const contact_refs = contact.sub_contacts.map(r => r.id)

    const refs = _.uniq([contact_id].concat(user_refs).concat(contact_refs))
    const results = await db.select('contact/timeline', [
      refs,
      pagination.timestamp / 1000000,
      pagination.limit
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

    if(results.length > 0)
      timeline[0].total = results[0].total

    return timeline
  }
}

Contact.associations = {
  users: {
    collection: true,
    optional: true,
    model: 'User'
  },
  deals: {
    collection: true,
    optional: true,
    model: 'Deal',
    enabled: false
  }
}

Orm.register('contact', 'Contact', Contact)

module.exports = Contact
