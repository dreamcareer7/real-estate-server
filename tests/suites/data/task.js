const due_date = new Date()

const task = {
  title: 'Hello, Task World!',
  due_date: due_date.getTime() / 1000,
  task_type: 'Todo'
}

const fixed_reminder = {
  is_relative: false,
  timestamp: task.due_date - 3600
}

const relative_reminder = {
  is_relative: true,
  timestamp: task.due_date - 7200
}

module.exports = {
  due_date,
  task,
  fixed_reminder,
  relative_reminder,
}
