const _ = require('lodash')

const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const Orm = require('../models/Orm.js')
const Task = require('../models/CRM/Task.js')

async function getTasks(req, res) {
  const query = req.query

  if (query.limit)
    query.limit = parseInt(query.limit)
  if (query.start)
    query.start = parseInt(query.start)

  const tasks = await Task.getForUser(req.user.id, query)

  res.collection(tasks)
}

async function create(req, res) {
  const data = req.body

  const task = await Task.create(data, req.user.id)
  res.model(task)
}

async function update(req, res) {
  const task_id = req.params.id
  const data = req.body

  expect(task_id).to.be.uuid

  const task = await Task.update(task_id, data, req.user.id)
  res.model(task)
}

async function remove(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  await Task.remove(task_id, req.user.id)

  res.status(204)
  return res.end()
}

async function fetchAssociations(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  await Task.get(task_id)
  const associations = await Task.getAssociations(task_id)

  res.collection(associations)
}

async function addAssociation(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  await Task.get(task_id)
  const added = await Task.addAssociation(req.body, task_id)

  res.model(added)
}

async function removeAssociation(req, res) {
  const task_id = req.params.id
  const association_id = req.params.association

  expect(task_id).to.be.uuid
  expect(association_id).to.be.uuid

  await Task.get(task_id)
  await Task.removeAssociation(association_id, task_id)

  res.status(204)
  res.end()
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/tasks', auth, am(getTasks))
  app.post('/crm/tasks', auth, am(create))
  app.put('/crm/tasks/:id', auth, am(update))
  app.delete('/crm/tasks/:id', auth, am(remove))
  app.get('/crm/tasks/:id/associations', auth, am(fetchAssociations))
  app.post('/crm/tasks/:id/associations', auth, am(addAssociation))
  app.delete('/crm/tasks/:id/associations/:association', auth, am(removeAssociation))
}