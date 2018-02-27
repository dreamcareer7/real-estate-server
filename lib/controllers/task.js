const _ = require('lodash')

const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
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

function protectedObject(type, id) {
  return {
    type: 'protected_object',
    id,
    main_type: type
  }
}

async function fetchAssociatedRecords(associations, type, accessFn, user_id) {
  const ids = associations
    .filter(a => a.association_type === type)
    .map(a => a[type])
  
  const records = await Orm.getAll(Orm.getModelFromType(type), ids)
  const records_indexed = _.keyBy(records, 'id')
  const records_access = await accessFn(user_id, records)

  for (const association of associations) {
    if (association.association_type === type) {
      if (records_access[association[type]]) {
        association[type] = records_indexed[association[type]]
      }
      else {
        association[type] = protectedObject(type, association[type])
      }
    }
  }
}

function trivialAccessFn(user_id, records) {
  const result = {}
  for (const r of records) {
    result[r.id] = true
  }

  return Promise.resolve(result)
}

async function fetchAssociations(req, res) {
  const user_id = req.user.id
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  const task = await Task.get(task_id)
  const associations = await Task.getAssociations(task_id)

  await fetchAssociatedRecords(associations, 'deal', Deal.canAccessDeals, user_id)
  await fetchAssociatedRecords(associations, 'contact', trivialAccessFn, user_id)
  await fetchAssociatedRecords(associations, 'listing', trivialAccessFn, user_id)

  res.collection(associations)
}

async function addAssociation(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  await Task.addAssociation(req.body, task_id)
  const updated = await Task.get(task_id)

  res.model(updated)
}

async function removeAssociation(req, res) {
  const task_id = req.params.id
  const association_id = req.params.association

  expect(task_id).to.be.uuid
  expect(association_id).to.be.uuid

  await Task.removeAssociation(association_id, task_id)
  const updated = await Task.get(task_id)

  res.model(updated)
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