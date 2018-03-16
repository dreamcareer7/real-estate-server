const expect = require('../utils/validator.js').expect
const promisify = require('../utils/promisify')
const am = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')
const Task = require('../models/CRM/Task')
const AttachedFile = require('../models/AttachedFile')

function limitAccess(action) {
  return (req, res, next) => {
    const task_id = req.params.id
    expect(task_id).to.be.uuid

    Task.hasAccess(req.user.id, action, [task_id]).nodeify((err, accessIndex) => {
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
  if (typeof query.q === 'string')
    query.q = [query.q]

  for (const k of ['limit', 'start', 'due_lte', 'due_gte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const tasks = await Task.getForUser(req.user.id, query)

  res.collection(tasks)
}

async function create(req, res) {
  const data = req.body
  const user_id = req.user.id
  const brand = Brand.getCurrent()

  const task = await Task.create(data, user_id, brand ? brand.id : undefined)
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

async function fetchAttachments(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  const file_ids = await AttachedFile.getByRole('CrmTask', task_id)
  const files = await promisify(AttachedFile.getAll)(file_ids)

  res.collection(files)
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'CrmTask',
      id: req.params.id
    }]
  }, (err, file) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

async function detach(req, res) {
  const task_id = req.params.id
  const file_id = req.params.file

  expect(task_id).to.be.uuid
  expect(file_id).to.be.uuid

  const task_files = await AttachedFile.getByRole('CrmTask', task_id)
  if (!task_files.includes(file_id)) {
    throw Error.ResourceNotFound(`Task attachment ${file_id} does not exist.`)
  }

  try {
    await promisify(AttachedFile.delete)(file_id)
  }
  catch (ex) {
    if (ex.code === 'ResourceNotFound') {
      throw Error.ResourceNotFound(`Task attachment ${file_id} does not exist.`)
    }
    else {
      throw ex
    }
  }

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

  app.get('/crm/tasks/:id/files', auth, limitAccess('read'), am(fetchAttachments))
  app.post('/crm/tasks/:id/files', auth, limitAccess('update'), attach)
  app.delete('/crm/tasks/:id/files/:file', auth, limitAccess('update'), detach)
}