const db = require('../../../utils/db.js')

class TaskAttachments {
  static async getAll(task_id) {
    return await db.selectIds('crm/task/attachments', [task_id])
  }
}

module.exports = TaskAttachments
