const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const promisify = require('../utils/promisify')
const _ = require('lodash')
const Excel = require('../utils/convert_to_excel')
const fixHeroku = require('../utils/fix-heroku.js')
const bodyParser = require('body-parser')

const Context = require('../models/Context')
const AttachedFile = require('../models/AttachedFile')
const DealChecklist = require('../models/Deal/checklist')
const Message = require('../models/Message/post')
const RoomActivity = require('../models/Activity/room')
const Room = require('../models/Room/get')
const Task = require('../models/Task')
const Gallery = require('../models/Gallery')
const GalleryItem = require('../models/Gallery/item')
const BrandStatus = require('../models/Brand/deal/status')
const BrandContext = require('../models/Brand/deal/context')
const BrandPropertyType = require('../models/Brand/deal/property_type/get')
const Deal = require('../models/Deal')
const { enqueue } = require('../models/Deal/email')
const User = require('../models/User/get')
const Brand = require('../models/Brand')
const Form = require('../models/Form')
const Submission = require('../models/Form/submission')
const DealRole = require('../models/Deal/role')
const DealContext = require('../models/Deal/context')
const Crypto = require('../models/Crypto')
const FormTemplate = require('../models/Brand/form/template/get')

const { updateTaskSubmission } = require('../models/Deal/form')

const roleDefinitions = require('../models/Brand/deal/property_type/roles')

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
  Deal.getUserDeals(req.user.id, req.query.limit, function (err, deals) {
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

const getForms = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const deal = await promisify(Deal.get)(id)

  const forms = await Form.getByBrand(deal.brand)
  res.collection(forms)
}

const getTemplates = async (req, res) => {
  const { id, form } = req.params

  expect(id).to.be.uuid
  const deal = await promisify(Deal.get)(id)

  const templates = await FormTemplate.getByForm({
    brand: deal.brand,
    form
  })

  res.collection(templates)
}

const getContexts = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const deal = await promisify(Deal.get)(id)

  const contexts = await BrandContext.getByBrand(deal.brand)
  res.collection(contexts)
}

const getStatuses = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const deal = await promisify(Deal.get)(id)

  const statuses = await BrandStatus.getByBrand(deal.brand)
  res.collection(statuses)
}

const getPropertyTypes = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const deal = await promisify(Deal.get)(id)

  const property_types = await BrandPropertyType.getByBrand(deal.brand)
  res.collection(property_types)
}

function brandDeals(req, res) {
  Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  }).nodeify(err => {
    if (err)
      return res.error(err)

    Deal.getBrandDeals(req.params.brand, req.query.limit, (err, deals) => {
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
    const id = await DealRole.create(role)

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

  await DealRole.update(role)

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

  res.model(deal)
}

const addTask = async (req, res) => {
  const task = req.body
  task.deal = req.params.id
  task.created_by = req.user.id

  const saved = await Task.create(task)
  const checklist = await DealChecklist.get(saved.checklist)

  await Deal.notifyById(task.deal)

  /*
   * For server#2055.
   * Splitter tasks are just informational and it's very confusing when we send notificationsf for them.
   * Don't.
   */
  if (task.task_type !== Task.SPLITTER) {
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
  }

  res.model(saved)
}

const addChecklist = async (req, res) => {
  const { conditions } = req.body
  let { checklist } = req.body

  if (!checklist)
    checklist = {}

  checklist.deal = req.params.id

  /*
   * Ok, now, the weird thing we do here is the unset/set of the user.
   * Why do we do this? Duh, Its complicated. Basically, here, the user (usually an agent) is trying to create a deal
   * which means the client will create the deal and then automatically send a request to create checklists for it.
   *
   * So now, the system is trying to create a checklist for a deal. the checklist, may have 3 tasks, a,b,c.
   * Task c, may have ACL on it set to BackOffice. That means the agent should not be able to see that task.
   *
   * So, without thist weird logic, what will happen is this:
   * The system will create a checklist, tasks a,b,c. When it creates task c, it'll try to get it as well.
   * But since the user doesn't have access to it, Task.get() call will fail with a not found exception.
   *
   * By calling unset, we'll make sure the DealChecklist.createWithTask will not work under current user, which
   * means Task.get() wont happen under current user, so it'll work.
   *
   * But then, when we need to return the created checklist, we need to get it for the current user, otherwise the task
   * with acl will be returned as well.
   */
  const user = Context.unset('user')
  const saved = await DealChecklist.createWithTasks(checklist, conditions)
  Context.set({user})

  await Deal.notifyById(checklist.deal)

  res.model(await (DealChecklist.get(saved.id)))
}

const updateChecklist = async (req, res) => {
  const checklist = req.body
  checklist.id = req.params.cid

  const saved = await DealChecklist.update(checklist)

  await Deal.notifyById(req.params.id)

  res.model(saved)
}

const sortChecklist = async (req, res) => {
  const saved = await DealChecklist.sort(req.params.cid, req.body)

  await Deal.notifyById(req.params.id)

  res.model(saved)
}

const submit = async (req, res) => {
  const { values, state, pdf, instructions } = req.body

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
    instructions
  }

  const task = await Task.get(task_id)

  const saved = await Task.setSubmission(task_id, submission)

  await Deal.notifyById(task.deal)

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

  const updated = await Task.setAttention({
    ...req.body,
    task,
    user: req.user
  })

  res.model(updated)
}

const patchRequired = async (req, res) => {
  expect(req.params.task).to.be.uuid

  const { required } = req.body
  expect(required).to.be.a('boolean')

  const task = await Task.get(req.params.task)
  const deal = await promisify(Deal.get)(task.deal)

  const updated = await Task.update({
    ...task,
    required
  })

  if(task.required !== required) {
    const activity = {
      action: 'UserRequiredTask',
      object_class: 'deal_task',
      object: {
        type: 'deal_task',
        task: updated,
        deal
      }
    }
    await promisify(RoomActivity.postToRoom)({
      room_id: task.room,
      user_id: req.user.id,
      activity
    })
  }

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

  const allowedPatchAttrs = ['attention_requested', 'title', 'acl']
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

  const submission = await updateTaskSubmission({
    user,
    deal,
    task
  })

  /*
   * We used to send a non-flat PDF to users.
   * The problem was, chrome would open those in an editable mode as
   * they were not flat. Users would start filling out the form without
   * realizing that it's not Rechat and there's no "Save" button.
   *
   * After filling out thr entire thing, they'd close the form, and realize
   * all their efforts are gone.
   *
   * So now we're sending a flat PDF to users. They won't be able to edit it.
   */
  const rev = await Submission.getRevision(submission.last_revision)
  const pdf = await Submission.flatten(rev)
  res.end(pdf)
}

const getRevision = async (req, res) => {
  const rev = req.params.revision
  expect(rev).to.be.uuid

  const revision = await Submission.getRevision(rev)
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
  fixHeroku(req)

  const brand_id = req.params.brand
  expect(brand_id).to.be.uuid
  const filename = 'deals.xlsx'
  res.attachment(filename)

  await Brand.limitAccess({
    user: req.user.id,
    brand: brand_id
  })
  
  const deals = await promisify(Deal.getBrandDeals)(brand_id)

  const role_ids = deals.map(d => d.roles).flat()
  const _roles = await DealRole.getAll(role_ids)
  const roles = _.groupBy(_roles, 'deal')

  const excel = new Excel.EntityToExcel(deals)

  excel
    .add({
      headerName: 'Deal Type',
      value: 'deal_type'
    })
    .add({
      headerName: 'Buyer',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Buyer'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Buyer (Email Address)',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Buyer'})
        return _.get(found, 'email', '')
      }
    })
    .add({
      headerName: 'Seller',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Seller'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller (Email Address)',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Seller'})
        return _.get(found, 'email', '')
      }
    })
    .add({
      headerName: 'Buyer Agent',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'BuyerAgent'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller Agent',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'SellerAgent'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller Referral',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'SellerReferral'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Buyer Referral',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'BuyerReferral'})
        return _.get(found, 'legal_full_name', '')
      }
    })

  const definitions = await BrandContext.getByBrand(brand_id)

  definitions
    .filter(def => def.exports)
    .forEach(def => {
      excel.add({
        headerName: def.label,
        value: _.partialRight(Deal.getContext, def.key)
      })
    })

  excel.prepare()
  await Excel.convert({
    columns: excel.getHeaders(),
    rows: excel.getRows()
  }, res)

  res.end()
}

async function filterToExcel(req, res) {
  fixHeroku(req)

  const filter = req.body

  const deals = await Deal.filter({
    filter,
    user: req.user
  })

  const filename = 'deals.xlsx'
  res.attachment(filename)
  

  const role_ids = deals.map(d => d.roles).flat()
  const _roles = await DealRole.getAll(role_ids)
  const roles = _.groupBy(_roles, 'deal')

  const excel = new Excel.EntityToExcel(deals)

  excel
    .add({
      headerName: 'Deal Type',
      value: 'deal_type'
    })
    .add({
      headerName: 'Buyer',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Buyer'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Buyer (Email Address)',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Buyer'})
        return _.get(found, 'email', '')
      }
    })
    .add({
      headerName: 'Seller',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Seller'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller (Email Address)',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'Seller'})
        return _.get(found, 'email', '')
      }
    })
    .add({
      headerName: 'Buyer Agent',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'BuyerAgent'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller Agent',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'SellerAgent'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Seller Referral',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'SellerReferral'})
        return _.get(found, 'legal_full_name', '')
      }
    })
    .add({
      headerName: 'Buyer Referral',
      value: deal => {
        const found = _.find(roles[deal.id], {role: 'BuyerReferral'})
        return _.get(found, 'legal_full_name', '')
      }
    })

  const definition_ids = _.chain(deals).map('context').flatten().head().map('definition').value()
  const definitions = await BrandContext.getAll(definition_ids)

  definitions
    .filter(def => def.exports)
    .forEach(def => {
      excel.add({
        headerName: def.label,
        value: _.partialRight(Deal.getContext, def.key)
      })
    })

  excel.prepare()
  await Excel.convert({
    columns: excel.getHeaders(),
    rows: excel.getRows()
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
  const room = await promisify(Room.get)(task.room)
  const file = await AttachedFile.get(req.params.file)

  expect(room.attachments).to.include(file.id)

  const saved = await AttachedFile.rename(file.id, filename)

  const activity = {
    action: 'UserRenamedFile',
    object_class: 'file_rename',
    object: {
      type: 'file_rename',
      old: file.name,
      'new': filename
    }
  }

  await promisify(RoomActivity.postToRoom)({
    room_id: task.room,
    user_id: req.user.id,
    activity
  })

  await Deal.notifyById(task.deal)

  res.model(saved)
}

const acceptEmail = (req, res) => {
  enqueue(req.body)
  res.status(200)
  res.end()
}

const addGalleryItem = async (req, res) => {
  const deal = await promisify(Deal.get)(req.params.id)

  const { file, fields } = await promisify(AttachedFile.saveFromRequest)({
    path: req.params.id,
    req,
    relations: [
      {
        role: 'Gallery',
        role_id: deal.gallery
      }
    ],
    public: true
  })

  const item = {
    order: 0,
    ...fields,
    file: file.id,
    gallery: deal.gallery
  }

  const [ saved ] = await GalleryItem.createAll([item])
  res.model(saved)
}

const updateGalleryItem = async (req, res) => {
  const item = {
    ...await GalleryItem.get(req.params.iid),
    ...req.body
  }

  const saved = await GalleryItem.update(item)
  res.model(saved)
}

const updateGalleryItemFile = async (req, res) => {
  const deal = await promisify(Deal.get)(req.params.id)

  const { file } = await promisify(AttachedFile.saveFromRequest)({
    path: req.params.id,
    req,
    relations: [
      {
        role: 'Gallery',
        role_id: deal.gallery
      }
    ],
    public: false
  })

  const item = {
    ...await GalleryItem.get(req.params.iid),
    file: file.id
  }

  const saved = await GalleryItem.update(item)
  res.model(saved)
}

const createGalleryZip = async (req, res) => {
  const { items } = req.body
  expect(items).to.be.an('array')

  const deal = await promisify(Deal.get)(req.params.id)
  const gallery = await Gallery.get(deal.gallery)

  const url = await Gallery.generateZipLink({
    user: req.user,
    items,
    gallery
  })

  res.json({
    info: {
      url
    }
  })
}

const createZip = async (req, res) => {
  const deal = await promisify(Deal.get)(req.params.id)
  const stream = await Deal.zip(deal)
  stream.pipe(res)
}

const deleteGalleryItems = async (req, res) => {
  expect(req.body.items).to.be.an('array')

  const deal = await promisify(Deal.get)(req.params.id)
  const items = await GalleryItem.getAll(req.body.items)

  for(const item of items) {
    expect(item.gallery).to.equal(deal.gallery)
    await GalleryItem.delete(item)
  }

  res.status(204)
  return res.end()
}

const sortGalleryItems = async (req, res) => {
  const deal = await promisify(Deal.get)(req.params.id)

  const pairs = req.body
  const saved = await GalleryItem.sort(pairs)

  for(const item of saved)
    expect(item.gallery).to.equal(deal.gallery)

  res.collection(saved)
}

const getContext = async (req, res) => {
  const name = req.params.cname

  expect(name).to.be.a('string')

  const revisions = await DealContext.getHistory(req.params.id, name)

  res.collection(revisions)
}

const getRoleDefinitions = (req, res) => {
  const definitions = Object.keys(roleDefinitions).map(role => roleDefinitions[role])
  res.collection(definitions)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/deals/:id.zip', auth, access, am(createZip))
  app.get('/deals/roles/definitions', getRoleDefinitions)

  app.post('/deals', auth, am(createDeal))
  app.get('/deals', auth, getDeals)

  app.post('/deals/filter', auth, am(filterDeals))
  app.post('/deals/filter.xlsx', auth, am(filterToExcel))

  app.get('/deals/:id', auth, access, getDeal)
  app.patch('/deals/:id/listing', auth, access, am(patchListing))
  app.patch('/deals/:id/draft', auth, access, am(patchIsDraft))
  app.patch('/deals/:id/property_type', auth, access, am(patchPropertyType))
  app.delete('/deals/:id', auth, am(deleteDeal))
  app.get('/deals/:id/forms', auth, access, am(getForms))
  app.get('/deals/:id/forms/templates/:form', auth, access, am(getTemplates))
  app.get('/deals/:id/contexts', auth, access, am(getContexts))
  app.get('/deals/:id/statuses', auth, access, am(getStatuses))
  app.get('/deals/:id/property_types', auth, access, am(getPropertyTypes))
  app.post('/deals/:id/context', auth, access, am(addContext))
  app.patch('/deals/:id/context/:cid/approved', auth, access, approveContext)
  app.get('/deals/:id/context/:cname', auth, access, am(getContext))
  app.post('/deals/:id/roles', auth, access, am(addRoles))
  app.put('/deals/:id/roles/:rid', auth, access, am(updateRole))
  app.delete('/deals/:id/roles/:rid', auth, access, am(deleteRole))
  app.post('/deals/:id/checklists', auth, access, am(addChecklist))
  app.put('/deals/:id/checklists/:cid', auth, access, am(updateChecklist))
  app.put('/deals/:id/checklists/:cid/sort', auth, access, am(sortChecklist))
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
  app.patch('/tasks/:task/required', auth, am(join), am(patchRequired))
  app.patch('/tasks/:task', auth, am(join), am(patchTask))
  app.delete('/tasks/:task', auth, am(join), am(deleteTask))

  app.post('/deals/:id/gallery/items', auth, access, am(addGalleryItem))
  app.put('/deals/:id/gallery/items/sort', auth, access, am(sortGalleryItems))
  app.put('/deals/:id/gallery/items/:iid', auth, access, am(updateGalleryItem))
  app.patch('/deals/:id/gallery/items/:iid/file', auth, access, am(updateGalleryItemFile))
  app.post('/deals/:id/gallery.zip', auth, access, am(createGalleryZip))
  app.delete('/deals/:id/gallery/items', auth, access, am(deleteGalleryItems))

  const urlEncoded = bodyParser.urlencoded({
    extended: true,
    limit: '5mb'
  })

  app.post('/deals/email', urlEncoded, acceptEmail)
}

module.exports = router
