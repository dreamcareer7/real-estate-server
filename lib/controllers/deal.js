const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const promisify = require('../utils/promisify')
const _ = require('lodash')
const excel = require('../utils/convert_to_excel')
const bodyParser = require('body-parser')

const AttachedFile = require('../models/AttachedFile')
const DealChecklist = require('../models/Deal/checklist')
const Message = require('../models/Message')
const Orm = require('../models/Orm')
const RoomActivity = require('../models/Activity/room')
const Task = require('../models/Task')

function getDeal(req, res) {
  const id = req.params.id

  expect(id).to.be.uuid

  Deal.get(id, function (err, deal) {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function getDeals(req, res) {
  Deal.getUserDeals(req.user.id, function (err, deals) {
    if (err)
      return res.error(err)

    res.collection(deals)
  })
}

const filterDeals = async (req, res) => {
  const filter = req.body

  const deals = await Deal.filter({
    filter,
    user: req.user
  })

  res.collection(deals)
}

const createDeal = async (req, res) => {
  const current = Brand.getCurrent()

  const brand_id = req.body.brand || current.id

  await Brand.limitAccess({
    user: req.user.id,
    brand: brand_id,
  })

  const details = {
    ...req.body,
    brand: brand_id
  }

  details.created_by = req.user.id

  const deal = await Deal.create(details)

  await Deal.notify({deal, action: Deal.CREATED})
  await Deal.BrokerWolf.considerSync(deal)

  res.model(deal)
}

const deleteDeal = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const deal = await promisify(Deal.get)(id)

  const roles = ['BackOffice', '*']
  if (deal.is_draft)
    roles.push('Deals') // If it's a draft, Agents are allowed to delete it.


  await Deal.limitAccess({
    user: req.user,
    deal_id: req.params.id,
    roles
  })

  await Deal.delete(id)

  await Deal.notify({
    deal,
    action: Deal.DELETED
  })

  res.status(204)
  return res.end()
}

function brandDeals(req, res) {
  Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  }).nodeify(err => {
    if (err)
      return res.error(err)

    Deal.getBrandDeals(req.params.brand, (err, deals) => {
      if (err)
        return res.error(err)

      res.collection(deals)
    })
  })
}

function brandInbox(req, res) {
  Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  }).nodeify(err => {
    if (err)
      return res.error(err)

    Deal.getBrandInbox(req.params.brand, (err, deals) => {
      if (err)
        return res.error(err)

      res.collection(deals)
    })
  })
}

const access = (req, res, next) => {
  expect(req.params.id).to.be.uuid

  Deal.limitAccess({
    user: req.user,
    deal_id: req.params.id
  }).nodeify(err => {
    if (err)
      return res.error(err)

    next()
  })
}

async function addRoles(req, res) {
  const roles = req.body.roles

  expect(req.params.id).to.be.uuid
  expect(roles).to.be.a('array')

  const ids = []

  for (const role of roles) {
    role.deal = req.params.id
    role.created_by = req.user.id
    const id = await Deal.addRole(role)

    ids.push(id)
  }

  const saved = await DealRole.getAll(ids)

  const deal = await promisify(Deal.get)(req.params.id)
  const updatedDeal = await Deal.updateTitle(deal)
  await Deal.notify({deal: updatedDeal})

  res.collection(saved)
}

async function updateRole(req, res) {
  const role = req.body
  role.id = req.params.rid

  expect(role.id).to.be.uuid
  expect(role).to.be.an('object')

  delete role.brokerwolf_id
  delete role.brokerwolf_row_version

  await Deal.updateRole(role)

  const updated = await DealRole.get(role.id)

  const deal = await promisify(Deal.get)(updated.deal)
  const updatedDeal = await Deal.updateTitle(deal)
  await Deal.notify({deal: updatedDeal})

  res.model(updated)
}

const deleteRole = async (req, res) => {
  const role_id = req.params.rid

  expect(role_id).to.be.uuid

  await DealRole.delete(role_id)

  const deal = await promisify(Deal.get)(req.params.id)
  const updated = await Deal.updateTitle(deal)

  await Deal.notify({deal: updated})

  res.status(204)
  return res.end()
}

const patchListing = async (req, res) => {
  const { listing } = req.body

  const old = await promisify(Deal.get)(req.params.id)
  old.listing = listing


  await Deal.update(old)
  const updated = await promisify(Deal.get)(req.params.id)

  const deal = await Deal.updateTitle(updated)

  await Deal.notifyById(deal.id)
  res.model(deal)
}

const patchIsDraft = async (req, res) => {
  const { is_draft } = req.body

  expect(is_draft).to.be.a('boolean')

  // You cannot draft a deal that is already live
  expect(is_draft).to.equal(false)

  const old = await promisify(Deal.get)(req.params.id)
  old.is_draft = is_draft

  await Deal.update(old)
  const deal = await promisify(Deal.get)(req.params.id)

  await Deal.notify({deal})
  await Deal.BrokerWolf.considerSync(deal)

  res.model(deal)
}

const patchPropertyType = async (req, res) => {
  const { property_type } = req.body

  expect(property_type).to.be.a('string')

  const old = await promisify(Deal.get)(req.params.id)
  old.property_type = property_type

  await Deal.update(old)
  const deal = await promisify(Deal.get)(req.params.id)

  await Deal.notify({deal})
  await Deal.BrokerWolf.considerSync(deal)

  res.model(deal)
}

const addTask = async (req, res) => {
  const task = req.body
  task.deal = req.params.id
  task.created_by = req.user.id

  const saved = await Task.create(task)
  const checklist = await DealChecklist.get(saved.checklist)

  await Deal.notifyById(task.deal)

  const activity = {
    action: 'UserAddedTask',
    object: Object.assign({}, saved, {
      checklist: checklist
    }),
    object_class: 'task'
  }

  await promisify(RoomActivity.postToRoom)({
    room_id: saved.room,
    user_id: req.user.id,
    activity,
    push: true
  })

  res.model(saved)
}

const addChecklist = async (req, res) => {
  const { conditions } = req.body
  let { checklist } = req.body

  if (!checklist)
    checklist = {}

  checklist.deal = req.params.id

  const saved = await DealChecklist.createWithTasks(checklist, conditions)

  await Deal.notifyById(checklist.deal)

  res.model(saved)
}

const updateChecklist = async (req, res) => {
  const checklist = req.body
  checklist.id = req.params.cid

  const saved = await DealChecklist.update(checklist)

  await Deal.notifyById(req.params.id)

  res.model(saved)
}

const submit = async (req, res) => {
  const { values, state, pdf, metadata } = req.body

  const task_id = req.params.task

  expect(task_id).to.be.uuid
  expect(values).to.be.an('object')
  expect(state).to.be.a('string')
  expect(pdf).to.be.a('string')

  const submission = {
    pdf,
    user_id: req.user.id,
    values,
    state,
    metadata
  }

  const task = await Task.get(task_id)
  const deal = await promisify(Deal.get)(task.deal)

  const saved = await Task.setSubmission(task_id, submission)

  await Deal.notifyById(task.deal)
  await Deal.BrokerWolf.considerSync(deal)

  res.model(saved)
}

const setReview = async (req, res) => {
  expect(req.params.task).to.be.uuid

  const review = req.body
  review.created_by = req.user.id

  const task = await Task.setReview(req.params.task, review)

  await Deal.notifyById(task.deal)

  res.model(task)
}

const patchAttention = async (req, res) => {
  expect(req.params.task).to.be.uuid
  expect(req.body.attention_requested).to.be.a('boolean')

  const task = await Task.get(req.params.task)
  const deal = await promisify(Deal.get)(task.deal)

  if(!task.attention_requested && req.body.attention_requested){
    const activity = {
      action: 'UserNotifiedOffice',
      object_class: 'deal_task',
      object: {
        type: 'deal_task',
        task,
        deal
      }
    }
    await promisify(RoomActivity.postToRoom)({
      room_id: task.room,
      user_id: req.user.id,
      activity
    })
  }

  task.attention_requested = req.body.attention_requested

  const updated = await Task.update(task)

  await Deal.notifyById(updated.deal)

  res.model(updated)
}

const deleteTask = async (req, res) => {
  expect(req.params.task).to.be.uuid

  const deleted = await Task.deleteAll([req.params.task])

  await Deal.notifyById(deleted[0].deal)
  res.status(204)
  return res.end()
}

async function updateTask(deal, task, attrs) {
  if (attrs.attention_requested && !task.attention_requested) {
    const activity = {
      action: 'UserNotifiedOffice',
      object_class: 'deal_task',
      object: {
        type: 'deal_task',
        task,
        deal
      }
    }

    await promisify(RoomActivity.postToRoom)({
      room_id: task.room,
      activity
    })
  }

  const allowedPatchAttrs = ['attention_requested', 'title']
  const taskToUpdate = Object.assign(task, _.pick(attrs, allowedPatchAttrs))

  return Task.update(taskToUpdate)
}

const patchTask = async (req, res) => {
  expect(req.params.task).to.be.uuid
  expect(req.body).to.be.an('object')

  const task = await Task.get(req.params.task)
  const deal = await promisify(Deal.get)(task.deal)
  const updated = await updateTask(deal, task, req.body)
  await Deal.notifyById(updated.deal)

  res.model(updated)
}

const patchAllTasks = async (req, res) => {
  expect(req.params.id).to.be.uuid
  expect(req.body).to.be.an('array')

  const ids = req.body.map(task => task.id)
  const requestTasksAttrs = _.keyBy(req.body, 'id')
  const tasks = await Task.getAll(ids)
  const deal = await promisify(Deal.get)(req.params.id)

  const updated = []
  for (const task of tasks) {
    await Task.addUser({
      user: req.user,
      task_id: task.id
    })
    updated.push(await updateTask(deal, task, requestTasksAttrs[task.id]))
  }

  await Deal.notifyById(req.params.id)

  res.collection(updated)
}

const getTask = async (req, res) => {
  expect(req.params.task).to.be.uuid

  const task = await Task.get(req.params.task)

  res.model(task)
}

const getPdf = async (req, res) => {
  const { hash } = req.query

  expect(hash).to.be.a('string')

  const decr = Crypto.decrypt(hash)

  const params = JSON.parse(decr)

  expect(params.task).to.be.uuid
  expect(params.user).to.be.uuid

  const user = await User.get(params.user)
  Context.set({user})

  const task = await Task.get(params.task)
  const deal = await promisify(Deal.get)(task.deal)

  const submission = await Deal.updateTaskSubmission({
    user,
    deal,
    task
  })

  const file = await AttachedFile.get(submission.file)

  res.redirect(file.url)
}

const getRevision = async (req, res) => {
  const rev = req.params.revision
  expect(rev).to.be.uuid

  const revision = await Form.getRevision(rev)
  res.model(revision)
}

async function addContext(req, res) {
  const context = req.body.context
  expect(context).to.be.an('array')

  await Deal.saveContext({
    deal: req.params.id,
    user: req.user.id,
    context,
  })

  const updated = await promisify(Deal.get)(req.params.id)
  const deal = await Deal.updateTitle(updated)

  await Deal.BrokerWolf.considerSync(deal)

  await Deal.notify({deal})
  res.model(deal)
}

function approveContext(req, res) {
  const approved = Boolean(req.body.approved)
  const context = req.params.cid

  expect(context).to.be.uuid

  Deal.setContextApproval({
    context,
    approved,
    user: req.user.id
  }, err => {
    if (err)
      return res.error(err)

    Deal.notifyById(req.params.id).nodeify((err, deal) => {
      if (err)
        return res.error(err)

      res.model(deal)
    })
  })
}

const join = async (req, res, next) => {
  await Task.addUser({
    user: req.user,
    task_id: req.params.task
  })

  return next()
}

const timeline = async (req, res) => {
  const task_id = req.params.task
  expect(task_id).to.be.a.uuid

  const activity = req.body
  expect(activity).to.be.a('object')

  const task = await Task.get(task_id)

  const saved = await promisify(RoomActivity.postToRoom)({
    room_id: task.room,
    activity
  })

  return res.model(saved)
}

async function getDealsAsExcel(req, res) {
  const brandId = req.params.brand
  expect(brandId).to.be.uuid
  const fileName = 'deals.xlsx'
  res.attachment(fileName)

  await Brand.limitAccess({
    user: req.user.id,
    brand: brandId
  })
  
  let deals = await promisify(Deal.getBrandDeals)(brandId)
  deals = await Orm.populate({
    models: deals,
    associations: ['brand.parent', 'deal.brand', 'deal.checklists']
  })

  for (let i = 0; i < deals.length; i++) {
    const ender_type = Deal.getContext(deals[i], 'ender_type')

    if (ender_type === 'AgentDoubleEnder' || ender_type === 'OfficeDoubleEnder') {
      deals.splice(i, 0, deals[i++])
    }
  }

  const model = new excel.EntityToExcel(deals)
  function findOfficeName(node) {
    const OFFICE_NAME_PROPERTY_KEY = 'office_title' // Emil said it should be branch_title but data is seen in office title
    if (node.messages && node.messages[OFFICE_NAME_PROPERTY_KEY]) {
      return node.messages[OFFICE_NAME_PROPERTY_KEY]
    }
    if (node.parent) {
      return findOfficeName(node.parent)
    }
    return ''
  }

  // @ts-ignore
  model
    .add({
      headerName: 'Deal Type',
      value: 'deal_type'
    })
    .add({
      headerName: 'Property Type',
      value: 'property_type'
    })
    .add({
      headerName: 'Created Date',
      value: 'created_at',
      format: x => new Date(x * 1000)
    })
    //     .add({
    //       headerName: 'New Contract Date',
    //       value: d => {
    //         const found = d.checklists.find(c => c.is_deactivatable)
    //         const date = found && new Date(found.created_at * 1000)
    //         return date
    //       }
    //     })
    .add({
      headerName: 'Buyer',
      value: deal => {
        const found = _.find(deal.roles, r => r.role === 'Buyer')
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller',
      value: deal => {
        const found = _.find(deal.roles, r => r.role === 'Seller')
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Buyer Agent',
      value: deal => {
        const found = _.find(deal.roles, r => r.role === 'BuyerAgent')
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller Agent',
      value: deal => {
        const found = _.find(deal.roles, r => r.role === 'SellerAgent')
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller Referral',
      value: deal => {
        const found = _.find(deal.roles, r => r.role === 'SellerReferral')
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Buyer Referral',
      value: deal => {
        const found = _.find(deal.roles, r => r.role === 'BuyerReferral')
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Office Name',
      value: deal => findOfficeName(deal.brand)
    })

  const definitions = await BrandContext.getByBrand(brandId)

  definitions
    .filter(def => def.exports)
    .forEach(def => {
      model.add({
        headerName: def.label,
        value: _.partialRight(Deal.getContext, def.key)
      })
    })

  model.prepare()
  await excel.convert({
    columns: model.getHeaders(),
    rows: model.getRows()
  }, res)
  
  res.end()
}

const postMessage = async (req, res) => {
  const task_id = req.params.task

  const message = req.body
  message.author = req.user.id

  const task = await Task.get(task_id)
  message.room = task.room

  Message.post(task.room, message, true, function (err, message) {
    if (err)
      return res.error(err)

    return res.model(message)
  })
}

const attach = async (req, res) => {
  const { file } = await promisify(AttachedFile.saveFromRequest)({
    path: req.params.id,
    req,
    relations: [
      {
        role: 'Deal',
        role_id: req.params.id
      }
    ],
    public: false
  })

  await Deal.notifyById(req.params.id)
  res.model(file)
}

async function detach(req, res) {
  expect(req.params.file).to.be.uuid
  const file = await AttachedFile.get(req.params.file)

  await AttachedFile.unlink(file.id, 'Deal', req.params.id)

  await Deal.notifyById(req.params.id)

  res.status(204)
  res.end()
}

const attachToTask = async (req, res) => {
  const task_id = req.params.task
  const task = await Task.get(task_id)
  const room_id = task.room
  const user_id = req.user.id

  const { file } = await promisify(AttachedFile.saveFromRequest)({
    path: room_id,
    req,
    relations: [
      {
        role: 'Room',
        role_id: room_id
      }
    ],
    public: false
  })

  const activity = {
    action: 'UserUploadedFile',
    object_class: 'file',
    object: file.id
  }

  await promisify(RoomActivity.postToRoom)({room_id, user_id, activity})
  res.model(file)
}

async function detachFromTask(req, res) {
  expect(req.params.file).to.be.uuid

  const task = await Task.get(req.params.task)
  const file = await AttachedFile.get(req.params.file)

  await AttachedFile.unlink(file.id, 'Room', task.room)

  const activity = {
    action: 'UserDeletedFile',
    object_class: 'file',
    object: file.id
  }

  await promisify(RoomActivity.postToRoom)({
    room_id: task.room,
    user_id: req.user.id,
    activity
  })

  await Deal.notifyById(task.deal)

  res.status(204)
  res.end()
}

async function rename(req, res) {
  expect(req.params.file).to.be.uuid

  const { filename } = req.body

  expect(filename).to.be.a('string')
  expect(filename.length > 0).to.be.true

  const task = await Task.get(req.params.task)
  const file = await AttachedFile.get(req.params.file)

  await AttachedFile.unlink(file.id, 'Room', task.room)

  const saved = await promisify(AttachedFile.saveFromUrl)({
    url: file.url,
    filename,
    relations: [
      {
        role: 'Room',
        role_id: task.room
      }
    ],
    public: false,
    path: task.room,
    user: req.user,
  })

  // Don't let them change a.pdf to a.jpg
  expect(saved.mime).to.equal(file.mime)

  const activity = {
    action: 'UserRenamedFile',
    object_class: 'file_rename',
    object: {
      type: 'file_rename',
      old: file,
      'new': saved
    }
  }

  await promisify(RoomActivity.postToRoom)({
    room_id: task.room,
    user_id: req.user.id,
    activity
  })

  await Deal.notifyById(task.deal)
  res.model(file)
}

const acceptEmail = async (req, res) => {
  await Deal.Email.enqueue(req.body)
  res.status(200)
  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/deals', auth, am(createDeal))
  app.get('/deals', auth, getDeals)

  app.post('/deals/filter', auth, am(filterDeals))

  app.get('/deals/:id', auth, access, getDeal)
  app.patch('/deals/:id/listing', auth, access, am(patchListing))
  app.patch('/deals/:id/draft', auth, access, am(patchIsDraft))
  app.patch('/deals/:id/property_type', auth, access, am(patchPropertyType))
  app.delete('/deals/:id', auth, am(deleteDeal))
  app.post('/deals/:id/context', auth, access, am(addContext))
  app.patch('/deals/:id/context/:cid/approved', auth, access, approveContext)
  app.post('/deals/:id/roles', auth, access, am(addRoles))
  app.put('/deals/:id/roles/:rid', auth, access, am(updateRole))
  app.delete('/deals/:id/roles/:rid', auth, access, am(deleteRole))
  app.post('/deals/:id/checklists', auth, access, am(addChecklist))
  app.put('/deals/:id/checklists/:cid', auth, access, am(updateChecklist))
  app.post('/deals/:id/tasks', auth, access, am(addTask))
  app.put('/deals/:id/tasks', auth, access, am(patchAllTasks))
  app.post('/deals/:id/files', auth, am(attach))
  app.delete('/deals/:id/files/:file', auth, am(detach))
  app.get('/brands/:brand/deals.(xls|xlsx)', auth, am(getDealsAsExcel))
  app.get('/brands/:brand/deals', auth, brandDeals)
  app.get('/brands/:brand/deals/inbox', auth, brandInbox)

  app.put('/tasks/:task/submission', auth, am(join), am(submit))
  app.put('/tasks/:task/review', auth, am(join), am(setReview))
  app.get('/tasks/:task', auth, am(join), am(getTask))
  app.get('/tasks/:task/submission.pdf', am(getPdf))
  app.get('/tasks/:task/submission/:revision', auth, am(join), am(getRevision))
  app.post('/tasks/:task/timeline', auth, am(join), am(timeline))
  app.post('/tasks/:task/messages', auth, am(join), am(postMessage))
  app.post('/tasks/:task/attachments', auth, am(join), am(attachToTask))
  app.delete('/tasks/:task/files/:file', auth, am(join), am(detachFromTask))
  app.post('/tasks/:task/files/:file/rename', auth, am(join), am(rename))

  app.patch('/tasks/:task/attention_requested', auth, am(join), am(patchAttention))
  app.patch('/tasks/:task', auth, am(join), am(patchTask))
  app.delete('/tasks/:task', auth, am(join), am(deleteTask))

  const urlEncoded = bodyParser.urlencoded({
    extended: true,
    limit: '5mb'
  })

  app.post('/deals/email', urlEncoded, am(acceptEmail))
}

module.exports = router
