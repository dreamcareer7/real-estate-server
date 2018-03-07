const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const Task = require('../models/CRM/Task')

function limitAccess(action) {
  return (req, res, next) => {
    const task_id = req.params.id
    expect(task_id).to.be.uuid

    Task.Access.hasAccess(req.user.id, action, [task_id]).nodeify((err, accessIndex) => {
      if (err) {
        return res.error(err)
      }

      if (!accessIndex.get(task_id)) {
        throw Error.ResourceNotFound(`Task ${task_id} not found`)
      }

      next()
    })
  }
}

async function get(req, res) {
  const task = await Task.get(req.params.id)

  res.model(task)
}

async function getTasks(req, res) {
  const query = req.query
  if (Array.isArray(query.q))
    query.q = query.q.join(' ')

  for (const k of ['limit', 'start', 'due_lte', 'due_gte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

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
  const associations = await Task.Associations.getAll(task_id)

  res.collection(associations)
}

async function addAssociation(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  const added = await Task.Associations.create(req.body, task_id)

  res.model(added)
}

async function removeAssociation(req, res) {
  const task_id = req.params.id
  const association_id = req.params.association

  expect(task_id).to.be.uuid
  expect(association_id).to.be.uuid

  await Task.Associations.remove(association_id, task_id)

  res.status(204)
  res.end()
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/tasks', auth, am(getTasks))
  app.get('/crm/tasks/search', auth, am(getTasks))
  app.post('/crm/tasks', auth, am(create))

  app.get('/crm/tasks/:id', auth, limitAccess('read'), am(get))
  app.put('/crm/tasks/:id', auth, limitAccess('update'), am(update))
  app.delete('/crm/tasks/:id', auth, limitAccess('delete'), am(remove))

  app.get('/crm/tasks/:id/associations', auth, limitAccess('read'), am(fetchAssociations))
  app.post('/crm/tasks/:id/associations', auth, limitAccess('update'), am(addAssociation))
  app.delete('/crm/tasks/:id/associations/:association', auth, limitAccess('update'), am(removeAssociation))
}