const { EventEmitter } = require('events')

const db = require('../../../utils/db.js')
const squel = require('squel').useFlavour('postgres')
const promisify = require('../../../utils/promisify')
const validator = require('../../../utils/validator.js')
const Orm = require('../../Orm')
const ObjectUtil = require('../../ObjectUtil')

const expect = validator.expect

const { associationSchema: schema } = require('./schemas.js')

class CrmAssociation extends EventEmitter {
  /**
   * Validates an input association object
   * @param {ICrmAssociationInput} association
   */
  async validate(association) {
    await validator.promise(schema, association)

    if (association.association_type === 'contact') {
      expect(association.contact).to.be.uuid
    } else if (association.association_type === 'listing') {
      expect(association.listing).to.be.uuid
    } else {
      expect(association.deal).to.be.uuid
    }
  }

  /**
   * Get an association by id
   * @param {UUID} id Association id to fetch
   */
  async get(id) {
    const result = await this.getAll([id])

    if (!result || result.length < 1) {
      throw Error.ResourceNotFound(`Association ${id} not found`)
    }

    return result[0]
  }

  /**
   * Bulk fetch association records by id
   * @param {UUID[]} ids Association ids to fetch
   * @returns {Promise<ICrmAssociation[]>}
   */
  async getAll(ids) {
    return await db.select('crm/associations/get', [
      ids,
      ObjectUtil.getCurrentUser()
    ])
  }

  /**
   * Adds association subquery conditions to a parent squel query object
   * @param {any} query Parent filtering query object
   * @param {TCrmAssociationParentType} parent_type 
   * @param {IAssociationFilters} options 
   */
  associationQuery(query, parent_type, options) {
    const conditions = []

    if (options.contact)
      conditions.push(['contact = ?', options.contact])

    if (options.deal)
      conditions.push(['deal = ?', options.deal])

    if (options.listing)
      conditions.push(['listing = ?', options.listing])

    if (conditions.length > 0) {
      const assocQuery = squel.expr()

      for (const cond of conditions) {
        const subquery = squel.select()
          .field(parent_type)
          .from('crm_associations')
          .where('deleted_at IS NULL')
        assocQuery.and('id = ANY(?)', subquery.where.apply(subquery, cond))
      }

      query.where(assocQuery)
    }
  }

  /**
   * Fetches all association objects for a parent record
   * @param {TCrmAssociationParentType} parent_type 
   * @param {UUID} parent_id 
   */
  async getForParentRecord(parent_type, parent_id) {
    const q = squel.select()
      .field('id')
      .from('crm_associations')
      .where('deleted_at IS NULL')
      .where(`${parent_type} = ?`, parent_id)

    const buildQuery = q.toParam()
    const res = await promisify(db.executeSql)(buildQuery.text, buildQuery.values)

    return this.getAll(res.rows.map(r => r.id))
  }

  /**
   * Insert association objects
   * @param {ICrmAssociationInput} association Association object to be added
   * @param {UUID} created_by User who created the association
   * @param {UUID} brand_id
   * @returns {Promise<ICrmAssociation>}
   */
  async create(association, created_by, brand_id) {
    await this.validate(association)

    const id = await db.insert('crm/associations/insert', [
      created_by,
      brand_id,

      association.association_type,
      association.crm_task,
      association.contact,
      association.deal,
      association.listing,
      association.index,
      association.metadata
    ])

    const created = await this.get(id)

    this.emit('create', created)

    return created
  }

  /**
   * Deletes association by id
   * @param {UUID} id Association id to be removed
   * @param {TCrmAssociationParentType} parent_type Type of the parent entity
   * @param {UUID} parent_id Id of the parent entity
   */
  async remove(id, parent_type, parent_id, deleted_by) {
    expect(id).to.be.uuid
    expect(parent_id).to.be.uuid

    const q = squel.update()
      .table('crm_associations')
      .set('deleted_at = now()')
      .set('deleted_by', deleted_by)
      .where('id = ?', id)
      .where(parent_type + ' = ?', parent_id)
      .returning(`${parent_type}, contact, deal, listing`)

    q.name = 'crm_association/delete'

    const res = await db.select(q, [])

    if (res.length > 0) {
      this.emit('delete', {
        parent_type,
        contact: res[0].contact,
        deal: res[0].deal,
        listing: res[0].listing,
      })
    }

    return res.length
  }
}

CrmAssociation.prototype.associations = {
  deal: {
    enabled: false,
    model: 'Deal'
  },
  contact: {
    enabled: false,
    model: 'Contact'
  },
  listing: {
    enabled: false,
    model: 'Listing'
  }
}

const Model = new CrmAssociation

Orm.register('crm_association', 'CrmAssociation', Model)

module.exports = Model
