const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')

const Task = require('../models/CRM/Task.js')

async function getTasks(req, res) {
  const query = req.query

  if (query.size)
    query.size = parseInt(query.size)
  if (query.start)
    query.start = parseInt(query.start)

  const tasks = await Task.getForUser(query)

  res.collection(tasks)
}

async function create(req, res) {
  const data = req.body

  const task = await Task.create(data)
  res.model(task)
}

async function update(req, res) {
  const task_id = req.params.id
  const data = req.body

  expect(task_id).to.be.uuid

  const task = await Task.update(task_id, data)
  res.model(task)
}

async function remove(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  await Task.remove(task_id)

  res.status(204)
  return res.end()
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/tasks', auth, am(getTasks))
  app.post('/crm/tasks', auth, am(create))
  app.put('/crm/tasks/:id', auth, am(update))
  app.delete('/crm/tasks/:id', auth, am(remove))
}