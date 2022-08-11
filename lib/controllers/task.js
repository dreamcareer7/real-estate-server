const expect = require('../utils/validator.js').expect
const promisify = require('../utils/promisify')
const am = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')
const Task = require('../models/CRM/Task')
const CrmAssociation = require('../models/CRM/Association')
const AttachedFile = require('../models/AttachedFile')

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

async function deleteTasks(req, res) {
  const query = Object.assign({}, req.body, req.query)
  if (typeof query.q === 'string') query.q = [query.q]

  for (const k of ['limit', 'start', 'due_lte', 'due_gte']) {
    if (query.hasOwnProperty(k)) query[k] = parseFloat(query[k])
  }

  const { ids } = await Task.filter(req.user.id, getCurrentBrand(), query)
  await Task.remove(ids, req.user.id)

  res.status(204)
  res.end()
}

async function create(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  req.body.associations = req.body?.associations?.map?.(a => ({ ...a, metadata: { origin: 'rechat' } }))

  const data = {
    ...req.body,
    created_by: user_id,
    brand: brand_id
  }

  const task = await Task.create(data)

  res.model(task)
}

async function update(req, res) {
  const user_id = req.user.id
  const task_id = req.params.id

  if (req.body.associations) {
    req.body.associations = req.body.associations.map(a => { return { ...a, metadata: { origin: 'rechat' } } })
  }

  const data = req.body

  // Ignore send_updates
  // if (req.body.metadata) {
  //   delete req.body.metadata.send_updates
  // }

  expect(task_id).to.be.uuid

  const task = await Task.update(task_id, data, user_id)
  res.model(task)
}

async function patchStatus(req, res) {
  const user_id = req.user.id
  const task_id = req.params.id

  expect(task_id).to.be.uuid
  const {
    title,
    description,
    due_date,
    end_date,
    task_type,
    metadata,
    all_day
  } = await Task.get(task_id)

  const payload = {
    title,
    description,
    due_date,
    end_date,
    status: req.body.status,
    task_type,
    metadata,
    all_day,
  }

  if (req.body.status === 'DONE') {
    payload.reminders = []

    const HOUR = 3600
    const DAY = 24 * HOUR
    const now = Date.now() / 1000    

    if (all_day) {
      payload.due_date = now - now % DAY
      payload.end_date = payload.due_date + DAY
    } else {
      payload.due_date = now
      payload.end_date = payload.due_date + HOUR
    }
  }

  const task = await Task.update(task_id, payload, user_id)

  res.model(task)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function remove(req, res) {
  const task_id = req.params.id
  expect(task_id).to.be.uuid

  // Ignore send_updates
  // if (req.body.metadata) {
  //   delete req.body.metadata.send_updates
  // }

  await Task.remove([task_id], req.user.id)

  res.status(204)
  return res.end()
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, RequireProp<ITaskCloneInput, 'brand' | 'created_by'>>} req
 * @param {import('../../types/monkey/controller').IResponse} res
 */
async function clone(req, res) {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()

  req.body.associations = req.body?.associations?.map?.(a => ({ ...a, metadata: { origin: 'rechat' } }))

  const data = {
    ...req.body,
    created_by: user_id,
    brand: brand_id
  }

  const task = await Task.clone(data, req.params.id)

  res.model(task)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ id: UUID }, {}, {}>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
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

  const associations = req.body.map(a => ({
    ...a,
    task: task_id,
    created_by: user_id,
    brand: brand_id
  }))

  const added_ids = await CrmAssociation.createMany(associations)
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
  const files = file_ids.length ? await AttachedFile.getAll(file_ids) : []

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
          role_id: req.params.id
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
  app.delete('/crm/tasks', brandAccess, auth, am(deleteTasks))

  app.get('/crm/tasks/:id', auth, access('read'), am(get))
  app.put('/crm/tasks/:id', auth, access('update'), am(update))
  app.patch('/crm/tasks/:id/status', auth, access('update'), am(patchStatus))
  app.delete('/crm/tasks/:id', auth, access('delete'), am(remove))
  app.post('/crm/tasks/:id/clone', auth, access('read'), am(clone))

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
}
