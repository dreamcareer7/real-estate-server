const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db')
const Orm = require('../Orm')
const { update_edges } = require('./worker/duplicate')

class ContactDuplicate {
  /**
   * @param {number[]} ids 
   * @returns {Promise<IContactDuplicateCluster[]>}
   */
  async getAll(ids) {
    return db.select('contact/duplicate/get', [ ids ])
  }

  async get(id) {
    const [cluster] = await this.getAll([id])

    if (!cluster) throw Error.ResourceNotFound(`Cluster ${id} was not found.`)

    return cluster
  }

  /**
   * Finds merge suggestions for a brand
   * @param {UUID} brand
   * @param {{ contact?: UUID; } & PaginationOptions} query
   */
  async filter(brand, query = {}) {
    const q = sq.select()
      .distinct()
      .field('cluster::INT', 'id')
      .from('contacts_duplicate_clusters')
      .join('contacts', undefined, 'contact = contacts.id')
      .where('check_contact_read_access(contacts.*, ?)', brand)
      .where('deleted_at IS NULL')

    if (query.contact)
      q.where('contact = ?', query.contact)

    // q.order('contacts.updated_at', false)

    if (query.start) q.offset(query.start)
    if (query.limit) q.limit(query.limit)

    q.name = 'contact/duplicate/filter'

    return db.map(q, [], 'id')
  }

  async findForBrand(brand_id, query = {}) {
    const ids = await this.filter(brand_id, query)

    Context.log(ids)

    return this.getAll(ids)
  }

  /**
   * Finds merge suggestions for a contact
   * @param {UUID} brand_id 
   * @param {UUID} contact_id
   * @returns {Promise<IContactDuplicateCluster>}
   */
  async findForContact(brand_id, contact_id) {
    const ids = await this.filter(brand_id, { contact: contact_id, limit: 1 })

    if (ids.length < 1) throw Error.ResourceNotFound(`Cluster not found for contact ${contact_id}.`)

    return this.get(ids[0])
  }

  /**
   * @param {number} cluster
   * @param {UUID} contact
   */
  async ignoreContactFromCluster(brand_id, cluster, contact) {
    /** @type {UUID[]} */
    const remaining = await db.map('contact/duplicate/ignore', [
      contact,
      cluster,
      brand_id
    ], 'contact')

    // Queue update_edges job after db transaction commit. Don't await!
    update_edges(brand_id, [...remaining, contact])
  }

  /**
   * @param {UUID} brand_id
   * @param {number} cluster
   */
  async ignoreCluster(brand_id, cluster) {
    /** @type {{ a: UUID; b: UUID}[]} */
    const remaining = await db.select('contact/duplicate/ignore_cluster', [
      cluster,
      brand_id
    ])

    const contacts = remaining.flatMap(row => [row.a, row.b])

    // Queue update_edges job after db transaction commit. Don't await!
    update_edges(brand_id, contacts)
  }

  async ignoreAll(brand_id) {
    /** @type {{ a: UUID; b: UUID}[]} */
    const remaining = await db.select('contact/duplicate/ignore_all', [
      brand_id
    ])

    const contacts = remaining.flatMap(row => [row.a, row.b])

    // Queue update_edges job after db transaction commit. Don't await!
    update_edges(brand_id, contacts)
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
