const squel = require('squel').useFlavour('postgres')

const expect = require('../../../utils/validator.js').expect
const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')

class TaskAccess {
  /**
   * Creates a SQL expression for controling read access on tasks
   * @param {UUID} user_id User id requesting tasks
   * @private
   */
  static readAccessQuery(user_id) {
    return squel.expr()
      .and('assignee = ?', user_id)
      .or('created_by = ?', user_id)
  }

  /**
   * Creates a SQL expression for controling update and delete access on tasks
   * @param {UUID} user_id User id requesting tasks
   * @private
   */
  static writeAccessQuery(user_id) {
    return squel.expr()
      .and('created_by = ?', user_id)
  }

  /**
   * Performs access control for the user on a number of task ids
   * @param {UUID} user_id User id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} task_ids Task ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  static async hasAccess(user_id, op, task_ids) {
    expect(task_ids).to.be.an('array')
  
    const query = squel.select()
      .field('id')
      .from('crm_tasks')
      .where('id = ANY($1)')

    switch (op) {
      case 'read':
        query.where(TaskAccess.readAccessQuery(user_id))
        break
      case 'update':
      case 'delete':
        query.where(TaskAccess.writeAccessQuery(user_id))
        break
      default:
        throw new Error('Unknown operation type')
    }

    const result = await promisify(db.executeSql)(query.toString(), [
      task_ids
    ])
    const green_ids = result.rows.map(r => r.id)

    const accessIndex = task_ids.reduce((index, tid) => {
      return index.set(tid, green_ids.includes(tid))
    }, new Map)

    return accessIndex
  }
}

module.exports = TaskAccess
