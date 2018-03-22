const db = require('../../../utils/db.js')
const squel = require('squel').useFlavour('postgres')
const promisify = require('../../../utils/promisify')
const validator = require('../../../utils/validator.js')
const Orm = require('../../Orm')

const expect = validator.expect

const { associationSchema: schema } = require('./schemas.js')

const CrmAssociation = {
  associations: {
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
  },

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
  },

  /**
   * Get an association by id
   * @param {UUID} id Association id to fetch
   */
  async get(id) {
    const result = await CrmAssociation.getAll([id])

    if (!result || result.length < 1) {
      throw Error.ResourceNotFound(`Association ${id} not found`)
    }

    return result[0]
  },

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
  },

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
  },

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
    
    const res = await promisify(db.executeSql)(q.toString(), [])

    return CrmAssociation.getAll(res.rows.map(r => r.id))
  },

  /**
   * Insert association objects
   * @param {ICrmAssociationInput} association Association object to be added
   * @returns {Promise<ICrmAssociation>}
   */
  async create(association) {
    await CrmAssociation.validate(association)

    const id = await db.insert('crm/associations/insert', [
      association.association_type,

      association.crm_task,
      association.crm_activity,
      association.contact,
      association.deal,
      association.listing
    ])

    return CrmAssociation.get(id)
  },

  /**
   * Deletes association by id
   * @param {UUID} id Association id to be removed
   * @param {TCrmAssociationParentType} parent_type Type of the parent entity
   * @param {UUID} parent_id Id of the parent entity
   */
  remove(id, parent_type, parent_id) {
    expect(id).to.be.uuid
    expect(parent_id).to.be.uuid

    const q = squel.delete()
      .from('crm_associations')
      .where('id = ?', id)
      .where(parent_type + ' = ?', parent_id)

    return promisify(db.executeSql)(q.toString(), [])
  }
}

Orm.register('crm_association', 'CrmAssociation', CrmAssociation)

module.exports = CrmAssociation
