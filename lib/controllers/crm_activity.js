const expect = require('../utils/validator.js').expect
const promisify = require('../utils/promisify')
const am = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')
const ActivityLog = require('../models/CRM/ActivityLog')
const AttachedFile = require('../models/AttachedFile')

function limitAccess(action) {
  return (req, res, next) => {
    const activity_id = req.params.id
    expect(activity_id).to.be.uuid

    ActivityLog.hasAccess(req.user.id, action, [activity_id]).nodeify((err, accessIndex) => {
      if (err) {
        return res.error(err)
      }

      if (!accessIndex.get(activity_id)) {
        throw Error.ResourceNotFound(`Activity log ${activity_id} not found`)
      }

      next()
    })
  }
}

async function get(req, res) {
  const activity = await ActivityLog.get(req.params.id)

  res.model(activity)
}

async function getAll(req, res) {
  const query = req.query
  if (typeof query.q === 'string')
    query.q = [query.q]

  for (const k of ['limit', 'start', 'due_lte', 'due_gte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const activities = await ActivityLog.getForUser(req.user.id, query)

  res.collection(activities)
}

async function create(req, res) {
  const data = req.body
  const user_id = req.user.id
  const brand = Brand.getCurrent()

  const activity = await ActivityLog.create(data, user_id, brand ? brand.id : undefined)
  res.model(activity)
}

async function update(req, res) {
  const activity_id = req.params.id
  const data = req.body

  expect(activity_id).to.be.uuid

  const activity = await ActivityLog.update(activity_id, data)
  res.model(activity)
}

async function remove(req, res) {
  const activity_id = req.params.id
  expect(activity_id).to.be.uuid

  await ActivityLog.remove(activity_id)

  res.status(204)
  return res.end()
}

async function fetchAssociations(req, res) {
  const activity_id = req.params.id
  expect(activity_id).to.be.uuid

  const associations = await ActivityLog.Associations.getForParent(activity_id)

  res.collection(associations)
}

async function addAssociation(req, res) {
  const activity_id = req.params.id
  expect(activity_id).to.be.uuid

  const added = await ActivityLog.Associations.create(req.body, activity_id)

  res.model(added)
}

async function removeAssociation(req, res) {
  const activity_id = req.params.id
  const association_id = req.params.association

  expect(activity_id).to.be.uuid
  expect(association_id).to.be.uuid

  const rowCount = await ActivityLog.Associations.remove(association_id, activity_id)
  
  if (rowCount === 1)
    res.status(204)
  else
    res.status(404)

  res.end()
}

async function addManyAssociations(req, res) {
  const activity_id = req.params.id
  expect(activity_id).to.be.uuid
  expect(req.body).to.be.an('array')

  const added = await ActivityLog.Associations.createMany(req.body, activity_id)

  res.collection(added)
}

async function removeManyAssociations(req, res) {
  const activity_id = req.params.id
  const association_ids = req.query.ids

  expect(activity_id).to.be.uuid
  expect(association_ids).to.be.an('array')

  await ActivityLog.Associations.removeMany(association_ids, activity_id)

  res.status(204)
  res.end()
}

async function fetchAttachments(req, res) {
  const activity_id = req.params.id
  expect(activity_id).to.be.uuid

  const file_ids = await AttachedFile.getByRole('CrmActivity', activity_id)
  const files = await promisify(AttachedFile.getAll)(file_ids)

  res.collection(files)
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'CrmActivity',
      id: req.params.id
    }]
  }, (err, file) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

async function detach(req, res) {
  const activity_id = req.params.id
  const file_id = req.params.file

  await detachFiles(activity_id, [file_id])

  res.status(204)
  res.end()
}

async function detachMany(req, res) {
  const activity_id = req.params.id
  const file_ids = req.query.ids

  await detachFiles(activity_id, file_ids)

  res.status(204)
  res.end()
}

async function detachFiles(activity_id, file_ids) {
  expect(activity_id).to.be.uuid
  expect(file_ids).to.be.an('array')

  const files = await AttachedFile.getByRole('CrmActivity', activity_id)

  for (const id of file_ids) {
    if (!files.includes(id)) {
      throw Error.ResourceNotFound(`Activity log attachment ${id} does not exist.`)
    }

    try {
      await promisify(AttachedFile.delete)(id)
    }
    catch (ex) {
      if (ex.code === 'ResourceNotFound') {
        throw Error.ResourceNotFound(`Activity log attachment ${id} does not exist.`)
      }
      else {
        throw ex
      }
    }
  }
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/activities', auth, am(getAll))
  app.get('/crm/activities/search', auth, am(getAll))
  app.post('/crm/activities', auth, am(create))

  app.get('/crm/activities/:id', auth, limitAccess('read'), am(get))
  app.put('/crm/activities/:id', auth, limitAccess('update'), am(update))
  app.delete('/crm/activities/:id', auth, limitAccess('delete'), am(remove))

  app.get('/crm/activities/:id/associations', auth, limitAccess('read'), am(fetchAssociations))
  app.post('/crm/activities/:id/associations', auth, limitAccess('update'), am(addAssociation))
  app.post('/crm/activities/:id/associations/bulk', auth, limitAccess('update'), am(addManyAssociations))
  app.delete('/crm/activities/:id/associations', auth, limitAccess('update'), am(removeManyAssociations))
  app.delete('/crm/activities/:id/associations/:association', auth, limitAccess('update'), am(removeAssociation))

  app.get('/crm/activities/:id/files', auth, limitAccess('read'), am(fetchAttachments))
  app.post('/crm/activities/:id/files', auth, limitAccess('update'), attach)
  app.delete('/crm/activities/:id/files', auth, limitAccess('update'), detachMany)
  app.delete('/crm/activities/:id/files/:file', auth, limitAccess('update'), detach)
}