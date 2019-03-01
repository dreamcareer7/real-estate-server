const expect = require('../utils/validator.js').expect
const promisify = require('../utils/promisify')
const am = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')
const Task = require('../models/CRM/Task')
const CrmAssociation = require('../models/CRM/Association')
const AttachedFile = require('../models/AttachedFile')
const Slack = require('../models/Slack.js')

const attachTouchEventHandler = require('../models/CRM/Touch/events')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) throw Error.BadRequest('Brand is not specified.')

  return brand.id
}

async function limitAaccess(user_id, brand_id, action, task_id) {
  await Brand.limitAccess({
    user: user_id,
    brand: brand_id
  })
  
  const accessIndex = await Task.hasAccess(user_id, brand_id, action, [
    task_id
  ])

  if (!accessIndex.get(task_id)) {
    throw Error.ResourceNotFound(`Task ${task_id} not found`)
  }
}

function access(action) {
  return (req, res, next) => {
    const task_id = req.params.id
    expect(task_id).to.be.uuid

    const brand = getCurrentBrand()
    const user = req.user.id

    limitAaccess(user, brand, action, task_id).nodeify((err) => {
      if (err) return res.error(err)
      next()
    })
  }
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) return res.error(err)

    next()
  })
}

async function get(req, res) {
  const task = await Task.get(req.params.id)

  res.model(task)
}

async function getTasks(req, res) {
  const query = req.query
  if (typeof query.q === 'string') query.q = [query.q]

  for (const k of ['limit', 'start', 'due_lte', 'due_gte']) {
    if (query.hasOwnProperty(k)) query[k] = parseFloat(query[k])
  }

  const tasks = await Task.getForUser(req.user.id, getCurrentBrand(), query)

  res.collection(tasks)
}

async function create(req, res) {
  const data = req.body
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const task = await Task.create(data, user_id, brand_id)

  const type_msg = /^[aeoiu]/.test(task.task_type.toLowerCase()) ? `an ${task.task_type}` : `a ${task.task_type}`
  Slack.send({
    channel: '6-support',
    text: `${(`<mailto:${req.user.email}|${req.user.display_name}>`)} created ${type_msg} event`,
    emoji: ':busts_in_silhouette:'
  })

  res.model(task)
}

async function update(req, res) {
  const user_id = req.user.id
  const task_id = req.params.id
  const data = req.body

  expect(task_id).to.be.uuid

  const task = await Task.update(task_id, data, user_id)
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

  const associations = await CrmAssociation.getForTask(task_id)

  res.collection(associations)
}

async function addAssociation(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const task_id = req.params.id
  expect(task_id).to.be.uuid

  const added = await CrmAssociation.create(req.body, task_id, user_id, brand_id)

  res.model(added)
}

async function removeAssociation(req, res) {
  /** @type {UUID} */
  const task_id = req.params.id

  /** @type {UUID} */
  const association_id = req.params.association

  /** @type {UUID} */
  const user_id = req.user.id

  expect(task_id).to.be.uuid
  expect(association_id).to.be.uuid

  const rowCount = await CrmAssociation.remove([association_id], task_id, user_id)

  if (rowCount === 1) res.status(204)
  else res.status(404)

  res.end()
}

async function bulkAddAssociation(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  const task_id = req.params.id
  expect(task_id).to.be.uuid
  expect(req.body).to.be.an('array')

  const added_ids = await CrmAssociation.createMany(req.body, task_id, user_id, brand_id)
  const added = await CrmAssociation.getAll(added_ids)

  res.collection(added)
}

async function bulkRemoveAssociation(req, res) {
  const task_id = req.params.id
  const association_ids = req.query.ids
  const user_id = req.user.id

  expect(task_id).to.be.uuid
  expect(association_ids).to.be.an('array')

  await CrmAssociation.remove(association_ids, task_id, user_id)

  res.status(204)
  res.end()
}

async function fetchAttachments(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  const file_ids = await AttachedFile.getByRole('CrmTask', task_id)
  const files = await AttachedFile.getAll(file_ids)

  res.collection(files)
}

function attach(req, res) {
  AttachedFile.saveFromRequest(
    {
      path: req.params.id,
      req,
      relations: [
        {
          role: 'CrmTask',
          id: req.params.id
        }
      ]
    },
    (err, {file}) => {
      if (err) res.error(err)

      res.model(file)
    }
  )
}

async function detach(req, res) {
  const task_id = req.params.id
  const file_id = req.params.file

  await detachFiles(task_id, [file_id])

  res.status(204)
  res.end()
}

async function detachMany(req, res) {
  const task_id = req.params.id
  const file_ids = req.query.ids

  await detachFiles(task_id, file_ids)

  res.status(204)
  res.end()
}

async function detachFiles(task_id, file_ids) {
  expect(task_id).to.be.uuid
  expect(file_ids).to.be.an('array')

  const files = await AttachedFile.getByRole('CrmTask', task_id)

  for (const id of file_ids) {
    if (!files.includes(id)) {
      throw Error.ResourceNotFound(`Task attachment ${id} does not exist.`)
    }

    try {
      await promisify(AttachedFile.delete)(id)
    } catch (ex) {
      if (ex.code === 'ResourceNotFound') {
        throw Error.ResourceNotFound(`Task attachment ${id} does not exist.`)
      } else {
        throw ex
      }
    }
  }
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/tasks', brandAccess, auth, am(getTasks))
  app.get('/crm/tasks/search', auth, brandAccess, am(getTasks))
  app.post('/crm/tasks', auth, brandAccess, am(create))

  app.get('/crm/tasks/:id', auth, access('read'), am(get))
  app.put('/crm/tasks/:id', auth, access('update'), am(update))
  app.delete('/crm/tasks/:id', auth, access('delete'), am(remove))

  app.get(
    '/crm/tasks/:id/associations',
    auth,
    access('read'),
    am(fetchAssociations)
  )
  app.post(
    '/crm/tasks/:id/associations',
    auth,
    access('update'),
    am(addAssociation)
  )
  app.post(
    '/crm/tasks/:id/associations/bulk',
    auth,
    access('update'),
    am(bulkAddAssociation)
  )
  app.delete(
    '/crm/tasks/:id/associations',
    auth,
    access('update'),
    am(bulkRemoveAssociation)
  )
  app.delete(
    '/crm/tasks/:id/associations/:association',
    auth,
    access('update'),
    am(removeAssociation)
  )

  app.get(
    '/crm/tasks/:id/files',
    auth,
    access('read'),
    am(fetchAttachments)
  )
  app.post('/crm/tasks/:id/files', auth, access('update'), attach)
  app.delete('/crm/tasks/:id/files', auth, access('update'), detachMany)
  app.delete('/crm/tasks/:id/files/:file', auth, access('update'), detach)

  attachTouchEventHandler()
}
