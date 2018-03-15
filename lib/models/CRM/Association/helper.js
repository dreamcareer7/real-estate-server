const CrmAssociation = require('./index')

function AssociationsHelper(parent_type) {
  return class {
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
     * Remove an association from a parent object
     * @param {UUID} association_id
     * @param {UUID} parent_id 
     */
    static remove(association_id, parent_id) {
      return CrmAssociation.remove(association_id, parent_type, parent_id)
    }
  }
}

module.exports = AssociationsHelper
