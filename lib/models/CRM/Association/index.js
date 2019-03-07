const _ = require('lodash')
const { EventEmitter } = require('events')

const db = require('../../../utils/db.js')
const sq = require('../../../utils/squel_extensions')
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
   * @param {IAssociationFilters} options 
   */
  associationQuery(query, options) {
    const conditions = []

    if (options.contact)
      conditions.push(['contact = ?', options.contact])

    if (options.deal)
      conditions.push(['deal = ?', options.deal])

    if (options.listing)
      conditions.push(['listing = ?', options.listing])

    if (conditions.length > 0) {
      const assocQuery = sq.expr()

      for (const cond of conditions) {
        const subquery = sq.select()
          .field('crm_task')
          .from('crm_associations')
          .where('deleted_at IS NULL')
        assocQuery.and('id = ANY(?)', subquery.where(cond[0], cond[1]))
      }

      query.where(assocQuery)
    }
  }

  /**
   * Fetches all association objects for a parent record
   * @param {UUID} task_id 
   */
  async getForTask(task_id) {
    const ids = await db.selectIds('crm/associations/get_for_task', [
      task_id
    ])

    return this.getAll(ids)
  }

  /**
   * @param {UUID[]} ids
   */
  async getAllCategorizedByType(ids) {
    const associations = await this.getAll(ids)
    const associations_index = _.groupBy(associations, 'crm_task')

    /** @type {Map<UUID, ICrmAssociationsCategorized>} */
    const result = new Map

    for (const task_id in associations_index) {
      if (Array.isArray(associations_index[task_id])) {
        /** @type {ICrmAssociationsCategorized} */
        const categories = {
          contacts: [],
          deals: [],
          listings: []
        }

        for (const assoc of associations_index[task_id]) {
          switch (assoc.association_type) {
            case 'deal':
              categories.deals.push(assoc.deal)
              break
            case 'listing':
              categories.listings.push(assoc.listing)
              break
            case 'contact':
              categories.contacts.push(assoc.contact)
              break
            default:
              break
          }
        }

        result.set(task_id, categories)
      }
    }

    return result
  }

  /**
   * Insert association objects
   * @param {ICrmAssociationInput} association Association object to be added
   * @param {UUID} task_id Id of the parent task
   * @param {UUID} created_by User who created the association
   * @param {UUID} brand_id
   * @returns {Promise<ICrmAssociation>}
   */
  async create(association, task_id, created_by, brand_id) {
    await this.validate(association)

    const id = await db.insert('crm/associations/insert', [
      created_by,
      brand_id,

      association.association_type,
      task_id,
      /** @type {ICrmAssociationInputContact} */(association).contact,
      /** @type {ICrmAssociationInputDeal} */(association).deal,
      /** @type {ICrmAssociationInputListing} */(association).listing,
      association.index,
      association.metadata
    ])

    const created = await this.get(id)

    this.emit('create', [id])

    return created
  }

  /**
   * Creates CrmAssociations in bulk
   * @param {ICrmAssociationInput[]} associations 
   * @param {UUID} created_by 
   * @param {UUID} brand 
   */
  async createMany(associations, created_by, brand) {
    for (const assoc of associations) {
      await this.validate(assoc)
    }

    const rows = associations.map(association => {
      return {
        created_by,
        brand,

        association_type: association.association_type,
        crm_task: association.task,
        contact: /** @type {ICrmAssociationInputContact} */(association).contact || null,
        deal: /** @type {ICrmAssociationInputDeal} */(association).deal || null,
        listing: /** @type {ICrmAssociationInputListing} */(association).listing || null,
        index: association.index || null,
        metadata: association.metadata || null
      }
    })

    const q = sq.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
      .into('crm_associations')
      .setFieldsRows(rows)
      .returning('id')

    // @ts-ignore
    q.name = 'contact/association/insert-many'

    const ids = await db.selectIds(q, [])

    this.emit('create', ids)

    return ids
  }

  /**
   * Deletes associations by id
   * @param {UUID[]} ids Association ids to be removed
   * @param {UUID} task_id Id of the parent entity
   */
  async remove(ids, task_id, deleted_by) {
    expect(ids).to.be.an('array')
    expect(task_id).to.be.uuid
    expect(deleted_by).to.be.uuid

    const res = await db.select('crm/associations/delete', [
      ids,
      task_id,
      deleted_by
    ])

    if (res.length > 0) {
      this.emit('delete', res)
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
