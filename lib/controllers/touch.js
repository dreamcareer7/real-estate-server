const expect = require('../utils/validator.js').expect
const promisify = require('../utils/promisify')
const am = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')
const Touch = require('../models/CRM/Touch')
const AttachedFile = require('../models/AttachedFile')

const attachTouchEventHandler = require('../models/CRM/Touch/events')

function limitAccess(action) {
  return (req, res, next) => {
    const touch_id = req.params.id
    expect(touch_id).to.be.uuid

    Touch.hasAccess(req.user.id, action, [touch_id]).nodeify((err, accessIndex) => {
      if (err) {
        return res.error(err)
      }

      if (!accessIndex.get(touch_id)) {
        throw Error.ResourceNotFound(`Touch ${touch_id} not found`)
      }

      next()
    })
  }
}

async function get(req, res) {
  const touch = await Touch.get(req.params.id)

  res.model(touch)
}

async function getAll(req, res) {
  const query = req.query
  if (typeof query.q === 'string')
    query.q = [query.q]

  for (const k of ['limit', 'start', 'due_lte', 'due_gte']) {
    if (query.hasOwnProperty(k))
      query[k] = parseFloat(query[k])
  }

  const touches = await Touch.getForUser(req.user.id, query)

  res.collection(touches)
}

async function create(req, res) {
  const data = req.body
  const user_id = req.user.id
  const brand = Brand.getCurrent()

  const touch = await Touch.create(data, user_id, brand ? brand.id : undefined)
  res.model(touch)
}

async function update(req, res) {
  const touch_id = req.params.id
  const data = req.body

  expect(touch_id).to.be.uuid

  const touch = await Touch.update(touch_id, data)
  res.model(touch)
}

async function remove(req, res) {
  const touch_id = req.params.id
  expect(touch_id).to.be.uuid

  await Touch.remove(touch_id)

  res.status(204)
  return res.end()
}

async function fetchAssociations(req, res) {
  const touch_id = req.params.id
  expect(touch_id).to.be.uuid

  const associations = await Touch.Associations.getForParent(touch_id)

  res.collection(associations)
}

async function addAssociation(req, res) {
  const touch_id = req.params.id
  expect(touch_id).to.be.uuid

  const added = await Touch.Associations.create(req.body, touch_id)

  res.model(added)
}

async function removeAssociation(req, res) {
  const touch_id = req.params.id
  const association_id = req.params.association

  expect(touch_id).to.be.uuid
  expect(association_id).to.be.uuid

  const rowCount = await Touch.Associations.remove(association_id, touch_id)
  
  if (rowCount === 1)
    res.status(204)
  else
    res.status(404)

  res.end()
}

async function addManyAssociations(req, res) {
  const touch_id = req.params.id
  expect(touch_id).to.be.uuid
  expect(req.body).to.be.an('array')

  const added = await Touch.Associations.createMany(req.body, touch_id)

  res.collection(added)
}

async function removeManyAssociations(req, res) {
  const touch_id = req.params.id
  const association_ids = req.query.ids

  expect(touch_id).to.be.uuid
  expect(association_ids).to.be.an('array')

  await Touch.Associations.removeMany(association_ids, touch_id)

  res.status(204)
  res.end()
}

async function fetchAttachments(req, res) {
  const touch_id = req.params.id
  expect(touch_id).to.be.uuid

  const file_ids = await AttachedFile.getByRole('Touch', touch_id)
  const files = await promisify(AttachedFile.getAll)(file_ids)

  res.collection(files)
}

function attach(req, res) {
  AttachedFile.saveFromRequest({
    path: req.params.id,
    req,
    relations: [{
      role: 'Touch',
      id: req.params.id
    }]
  }, (err, file) => {
    if (err)
      res.error(err)

    res.model(file)
  })
}

async function detach(req, res) {
  const touch_id = req.params.id
  const file_id = req.params.file

  await detachFiles(touch_id, [file_id])

  res.status(204)
  res.end()
}

async function detachMany(req, res) {
  const touch_id = req.params.id
  const file_ids = req.query.ids

  await detachFiles(touch_id, file_ids)

  res.status(204)
  res.end()
}

async function detachFiles(touch_id, file_ids) {
  expect(touch_id).to.be.uuid
  expect(file_ids).to.be.an('array')

  const files = await AttachedFile.getByRole('Touch', touch_id)

  for (const id of file_ids) {
    if (!files.includes(id)) {
      throw Error.ResourceNotFound(`Touch attachment ${id} does not exist.`)
    }

    try {
      await promisify(AttachedFile.delete)(id)
    }
    catch (ex) {
      if (ex.code === 'ResourceNotFound') {
        throw Error.ResourceNotFound(`Touch attachment ${id} does not exist.`)
      }
      else {
        throw ex
      }
    }
  }
}

module.exports = function(app) {
  const auth = app.auth.bearer.middleware

  app.get('/crm/touches', auth, am(getAll))
  app.get('/crm/touches/search', auth, am(getAll))
  app.post('/crm/touches', auth, am(create))

  app.get('/crm/touches/:id', auth, limitAccess('read'), am(get))
  app.put('/crm/touches/:id', auth, limitAccess('update'), am(update))
  app.delete('/crm/touches/:id', auth, limitAccess('delete'), am(remove))

  app.get('/crm/touches/:id/associations', auth, limitAccess('read'), am(fetchAssociations))
  app.post('/crm/touches/:id/associations', auth, limitAccess('update'), am(addAssociation))
  app.post('/crm/touches/:id/associations/bulk', auth, limitAccess('update'), am(addManyAssociations))
  app.delete('/crm/touches/:id/associations', auth, limitAccess('update'), am(removeManyAssociations))
  app.delete('/crm/touches/:id/associations/:association', auth, limitAccess('update'), am(removeAssociation))

  app.get('/crm/touches/:id/files', auth, limitAccess('read'), am(fetchAttachments))
  app.post('/crm/touches/:id/files', auth, limitAccess('update'), attach)
  app.delete('/crm/touches/:id/files', auth, limitAccess('update'), detachMany)
  app.delete('/crm/touches/:id/files/:file', auth, limitAccess('update'), detach)
  
  attachTouchEventHandler()
}