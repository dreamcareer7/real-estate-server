/**
 * @param {ITask} task 
 */
const shouldUpdateLastTouch = (task) => {
  return task.task_type !== 'Other' && task.task_type !== 'Note'
}

/**
 * @param {ITask} task 
 */
const shouldReceiveNotification = (task) => {
  return task.task_type !== 'Note'
}


module.exports = {
  shouldUpdateLastTouch,
  shouldReceiveNotification
}