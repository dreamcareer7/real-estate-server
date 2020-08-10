const _ = require('lodash')
const db = require('../../../utils/db')
const ObjectUtil = require('../../ObjectUtil')



/**
 * Get an association by id
 * @param {UUID} id Association id to fetch
 */
const get = async (id) => {
  const result = await getAll([id])

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
const getAll = async (ids) => {
  return await db.select('crm/associations/get', [
    ids,
    ObjectUtil.getCurrentUser()
  ])
}

/**
 * Fetches all association objects for a parent record
 * @param {UUID} task_id 
 */
const getForTask = async (task_id) => {
  const ids = await db.selectIds('crm/associations/get_for_task', [
    task_id
  ])

  return getAll(ids)
}

/**
 * @param {UUID[]} ids
 */
const getAllCategorizedByType = async (ids) => {
  const associations = await getAll(ids)
  const associations_index = _.groupBy(associations, 'crm_task')

  /** @type {Map<UUID, ICrmAssociationsCategorized>} */
  const result = new Map

  for (const task_id in associations_index) {
    if (Array.isArray(associations_index[task_id])) {
      /** @type {ICrmAssociationsCategorized} */
      const categories = {
        contacts: [],
        deals: [],
        listings: [],
        emails: []
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
          case 'email':
            categories.emails.push(assoc.email)
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


module.exports =  {
  get,
  getAll,
  getForTask,
  getAllCategorizedByType
}