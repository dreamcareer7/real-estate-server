const _ = require('lodash')

const db = require('../../../utils/db')
const sq = require('../../../utils/squel_extensions')
const validator = require('../../../utils/validator')
const expect = validator.expect

const { associationSchema: schema } = require('./schemas.js')
const emitter = require('./emitter')
const { get } = require('./get')



/**
 * Validates an input association object
 * @param {ICrmTaskAssociationInput} association
 */
const validate = async (association) => {
  await validator.promise(schema, association)

  if (association.association_type === 'contact') {
    expect(association.contact).to.be.uuid
  } else if (association.association_type === 'listing') {
    expect(association.listing).to.be.uuid
  } else if (association.association_type === 'deal') {
    expect(association.deal).to.be.uuid
  } else {
    expect(association.email).to.be.uuid
  }
}

/**
 * Adds association subquery conditions to a parent squel query object
 * @param {any} query Parent filtering query object
 * @param {IAssociationFilters} options 
 */
const associationQuery = (query, options) => {
  const conditions = []

  if (options.contact)
    conditions.push(['contact = ?', options.contact])

  if (options.deal)
    conditions.push(['deal = ?', options.deal])

  if (options.listing)
    conditions.push(['listing = ?', options.listing])

  if (options.email)
    conditions.push(['email = ?', options.email])

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
 * Insert association objects
 * @param {ICrmAssociationInput} association Association object to be added
 * @param {UUID} task_id Id of the parent task
 * @param {UUID} created_by User who created the association
 * @param {UUID} brand_id
 * @returns {Promise<ICrmAssociation>}
 */
const create = async (association, task_id, created_by, brand_id) => {
  await validate(association)

  const id = await db.insert('crm/associations/insert', [
    created_by,
    brand_id,

    association.association_type,
    task_id,
    /** @type {ICrmAssociationInputContact} */(association).contact,
    /** @type {ICrmAssociationInputDeal} */(association).deal,
    /** @type {ICrmAssociationInputListing} */(association).listing,
    /** @type {ICrmAssociationInputEmail} */(association).email,
    association.index,
    association.metadata
  ])

  const created = await get(id)

  emitter.emit('create', [{ id, brand: brand_id, created_by }])

  return created
}

/**
 * Creates CrmAssociations in bulk
 * @param {ICrmAssociationInput[]} associations 
 */
const createMany = async (associations) => {
  if (associations.length < 1) return []

  for (const assoc of associations) {
    await validate(assoc)
  }

  const rows = associations.map(association => {
    return {
      created_by: association.created_by,
      brand: association.brand,

      association_type: association.association_type,
      crm_task: association.task,
      contact: /** @type {ICrmAssociationInputContact} */(association).contact || null,
      deal: /** @type {ICrmAssociationInputDeal} */(association).deal || null,
      listing: /** @type {ICrmAssociationInputListing} */(association).listing || null,
      email: /** @type {ICrmAssociationInputEmail} */(association).email || null,
      index: association.index || null,
      metadata: association.metadata ? JSON.stringify(association.metadata) : null
    }
  })

  const LIBPQ_PARAMETER_LIMIT = 0xFFFF

  const res = await Promise.all(_(rows)
    .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / Object.keys(rows[0]).length))
    .map((chunk, i) => {
      const q = sq.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
        .into('crm_associations')
        .setFieldsRows(chunk)
        .returning('id')
        .returning('brand')
        .returning('created_by')
        .returning('contact')

      // @ts-ignore
      q.name = `contact/association/insert-many#${i}`

      return db.select(q)
    })
    .value()
  )

  const added = res.flat()
  emitter.emit('create', added)

  const added_contacts = added.filter(a => Boolean(a.contact))
  if (added_contacts.length > 0) {
    emitter.emit('create:contact', added_contacts)
  }

  return added.map(r => r.id)
}

/**
 * @param {{id: UUID; index?: number; metadata?: unknown}[]} associations 
 */
const update = async (associations) => {
  for (const a of associations) {
    expect(a.id).to.be.uuid
  }

  await db.update('crm/associations/update', [
    JSON.stringify(associations)
  ])
}

/**
 * Deletes associations by id
 * @param {UUID[]} ids Association ids to be removed
 * @param {UUID} deleted_by Id of current user
 */
const remove = async (ids, task_id, deleted_by) => {
  expect(ids).to.be.an('array')
  expect(deleted_by).to.be.uuid

  const res = await db.select('crm/associations/delete', [
    ids,
    deleted_by
  ])

  if (res.length > 0) {
    emitter.emit('delete', res)
  }

  return res.length
}


module.exports =  {
  validate,
  associationQuery, 
  create,
  createMany,
  update,
  remove
}
