const due_date = new Date()

const task = {
  title: 'Hello, Task World!',
  description: 'This is a test task.',
  due_date: due_date.getTime(),
  task_type: 'Todo'
}

module.exports = {
  due_date,
  task
}
