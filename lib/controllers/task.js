const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')

const Task = require('../models/CRM/Task.js')

async function getTasks(req, res) {
  const tasks = await Task.getForUser()

  res.collection(tasks)
}

async function create(req, res) {
  const data = req.body

  const task = await Task.create(data)
  res.model(task)
}

async function remove(req, res) {
  await Task.remove(req.params.id)

  res.status(204)
  return res.end()
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/tasks', auth, am(getTasks))
  app.post('/crm/tasks', auth, am(create))
  app.delete('/crm/tasks/:id', auth, am(remove))
}