const CrmAssociation = require('./index')
const { asyncMap } = require('../../../utils/belt')

function AssociationsHelper(parent_type) {
  return class Associations {
    /**
     * Fetches all association objects for a parent object
     * @param {UUID} parent_id Parent object id
     */
    static getAll(parent_id) {
      return CrmAssociation.getForParentRecord(parent_type, parent_id)
    }

    /**
     * Adds an association to a parent object
     * @param {ICrmAssociationInput} association Association object
     * @param {UUID} parent_id Parent object's id
     * @returns {Promise<ICrmAssociation>} The created association object
     */
    static create(association, parent_id) {
      association[parent_type] = parent_id
      return CrmAssociation.create(association)
    }

    /**
     * Adds an array of associations to a parent object
     * @param {ICrmAssociationInput[]} associations Association object array
     * @param {UUID} parent_id Parent object's id
     * @returns {Promise<ICrmAssociation[]>} The created association object
     */
    static async bulkCreate(associations, parent_id) {
      return asyncMap(associations, assoc => Associations.create(assoc, parent_id))
    }

    /**
     * Remove an association from a parent object
     * @param {UUID} association_id
     * @param {UUID} parent_id 
     */
    static remove(association_id, parent_id) {
      return CrmAssociation.remove(association_id, parent_type, parent_id)
    }

    /**
     * Remove an array of associations from a parent object
     * @param {UUID[]} association_ids
     * @param {UUID} parent_id 
     */
    static async bulkRemove(association_ids, parent_id) {
      for (const id of association_ids) {
        await Associations.remove(id, parent_id)
      }
    }
  }
}

module.exports = AssociationsHelper
