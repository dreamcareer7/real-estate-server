const _ = require('lodash')

const CrmAssociation = require('./index')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

function AssociationsHelper(parent_type) {
  return class Associations {
    /**
     * Fetches all association objects for a parent object
     * @param {UUID} parent_id Parent object id
     */
    static getForParent(parent_id) {
      return CrmAssociation.getForParentRecord(parent_type, parent_id)
    }

    static async getAllCategorizedByType(ids) {
      const associations = await CrmAssociation.getAll(ids)
      const associations_index = _.groupBy(associations, parent_type)

      /** @type {Map<UUID, ICrmAssociationsCategorized>} */
      const result = new Map

      for (const parent_id in associations_index) {
        if (Array.isArray(associations_index[parent_id])) {
          /** @type {ICrmAssociationsCategorized} */
          const categories = {
            contacts: [],
            deals: [],
            listings: []
          }
  
          for (const assoc of associations_index[parent_id]) {
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

          result.set(parent_id, categories)
        }
      }

      return result
    }

    /**
     * Adds an association to a parent object
     * @param {ICrmAssociationInput} association Association object
     * @param {UUID} parent_id Parent object's id
     * @param {UUID} created_by
     * @param {UUID} brand_id
     * @returns {Promise<ICrmAssociation>} The created association object
     */
    static create(association, parent_id, created_by, brand_id) {
      association[parent_type] = parent_id
      return CrmAssociation.create(association, created_by, brand_id)
    }

    /**
     * Adds an array of associations to a parent object
     * @param {ICrmAssociationInput[]} associations Association object array
     * @param {UUID} parent_id Parent object's id
     * @param {UUID} created_by
     * @param {UUID} brand
     * @returns {Promise<ICrmAssociation[]>} The created association object
     */
    static async createMany(associations, parent_id, created_by, brand) {
      for(const association of associations) {
        association[parent_type] = parent_id
      }

      return CrmAssociation.createMany(associations, created_by, brand)
    }

    /**
     * Remove an association from a parent object
     * @param {UUID} association_id
     * @param {UUID} parent_id 
     * @param {UUID} deleted_by
     */
    static remove(association_id, parent_id, deleted_by) {
      return CrmAssociation.remove(association_id, parent_type, parent_id, deleted_by)
    }

    /**
     * Remove an array of associations from a parent object
     * @param {UUID[]} association_ids
     * @param {UUID} parent_id 
     * @param {UUID} deleted_by
     */
    static async removeMany(association_ids, parent_id, deleted_by) {
      for (const id of association_ids) {
        await Associations.remove(id, parent_id, deleted_by)
      }
    }
  }
}

module.exports = AssociationsHelper
