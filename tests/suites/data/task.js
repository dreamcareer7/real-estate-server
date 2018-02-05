const task = {
  title: 'Hello, Task World!',
  description: 'This is a test task.',
  due_date: (new Date()).toISOString(),
  status: 'PENDING',
  task_type: 'Todo'
}

module.exports = {
  task
}
