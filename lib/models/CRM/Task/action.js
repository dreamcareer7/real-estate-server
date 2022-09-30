const db = require('../../../utils/db')

/**
 * @param {ITask} task 
 */
const shouldUpdateLastTouch = (task) => {
  return task.task_type !== 'Other' && task.task_type !== 'Note'
}

/**
 * @param {UUID[]} tasks
 */
const findTasksThatShouldReceiveNotification = (tasks) => {
  return db.selectIds('crm/task/should_send_notification', [tasks])
}


module.exports = {
  shouldUpdateLastTouch,
  findTasksThatShouldReceiveNotification
}
