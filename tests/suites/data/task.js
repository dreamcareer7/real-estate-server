const due_date = new Date()

const task = {
  title: 'Hello, Task World!',
  description: 'This is a test task.',
  due_date: due_date.getTime(),
  task_type: 'Todo'
}

const fixed_reminder = {
  is_relative: false,
  timestamp: task.due_date + 3600 * 1000
}

const relative_reminder = {
  is_relative: true,
  time: 1800
}

module.exports = {
  due_date,
  task,
  fixed_reminder,
  relative_reminder,
}
