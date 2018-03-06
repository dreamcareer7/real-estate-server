const CrmAssociation = require('../Association')

class TaskAssociations {
  /**
   * Fetches all association objects for a task
   * @param {UUID} task_id Parent task id
   */
  static getAll(task_id) {
    return CrmAssociation.getForParentRecord('crm_task', task_id)
  }

  /**
   * Adds an association to a task
   * @param {ICrmAssociationInput} association Association object
   * @param {UUID} task_id Parent task's id
   * @returns {Promise<ICrmAssociation>} The created association object
   */
  static create(association, task_id) {
    association.crm_task = task_id
    return CrmAssociation.create(association)
  }

  /**
   * Remove an association from a task
   * @param {UUID} association_id
   * @param {UUID} task_id 
   */
  static remove(association_id, task_id) {
    return CrmAssociation.remove(association_id, 'crm_task', task_id)
  }
}

module.exports = TaskAssociations
