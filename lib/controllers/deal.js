const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const promisify = require('../utils/promisify')

function getDeal (req, res) {
  req.access.deny('Client')

  const id = req.params.id

  expect(id).to.be.uuid

  Deal.get(id, function (err, deal) {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function getDeals (req, res) {
  req.access.deny('Client')

  Deal.getUserDeals(req.user.id, function (err, deals) {
    if (err)
      return res.error(err)

    res.collection(deals)
  })
}

function createDeal(req, res) {
  if (!req.user.features || req.user.features.indexOf('Deals') < 0)
    return res.error(Error.Forbidden())

  req.access.deny('Client')

  const deal = req.body

  deal.created_by = req.user.id

  if (!deal.listing && !(deal.deal_context && deal.deal_context.full_address))
    return res.error(Error.Validation('Provide listing or full address'))

  Deal.create(deal, (err, deal) => {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function deleteDeal(req, res) {
  const deal_id = req.params.id

  expect(deal_id).to.be.uuid

  Deal.delete(deal_id, err => {
    if(err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
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
  Deal.getBrandInbox(req.params.brand, (err, deals) => {
    if (err)
      return res.error(err)

    res.collection(deals)
  })
}

const access = (req, res, next) => {
  expect(req.params.id).to.be.uuid

  Deal.limitAccess({
    user: req.user,
    deal_id: req.params.id
  }, err => {
    if (err)
      res.error(err)

    next()
  })
}

function addRole(req, res) {
  req.access.deny('Client')

  const role = req.body

  role.created_by = req.user.id
  role.deal = req.params.id

  expect(role.deal).to.be.uuid

  Deal.addRole(role, (err, deal) => {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function patchListing(req, res) {
  req.access.deny('Client')

  const { listing } = req.body

  Deal.get(req.params.id, (err, deal) => {
    if (err)
      return res.error(err)

    deal.listing = listing

    Deal.update(deal, err => {
      if (err)
        return res.error(err)

      Deal.get(deal.id, (err, saved) => {
        if (err)
          return res.error(err)

        res.model(saved)
      })
    })
  })
}

const addTask = (req, res) => {
  req.access.deny('Client')

  const task = req.body
  task.deal = req.params.id

  Task.create(task).nodeify((err, task) => {
    if (err)
      return res.error(err)

    res.model(task)
  })
}

const addChecklist = (req, res) => {
  req.access.deny('Client')

  const checklist = req.body
  checklist.deal = req.params.id

  DealChecklist.create(checklist).nodeify((err, checklist) => {
    if (err)
      return res.error(err)

    res.model(checklist)
  })
}

const submit = async (req, res) => {
  req.access.deny('Client')

  const values = req.body.values
  const state = req.body.state

  const task_id = req.params.task
  const form_id = req.body.form
  expect(task_id).to.be.uuid
  expect(form_id).to.be.uuid
  expect(values).to.be.an('object')
  expect(state).to.be.a('string')

  const submission = {
    form_id,
    user_id: req.user.id,
    values,
    state,
    token: req.token_info.access_token
  }

  const saved = await Task.setSubmission(task_id, submission)

  res.model(saved)
}

const setReview = async (req, res) => {
  req.access.deny('Client')

  expect(req.params.task).to.be.uuid

  const review = req.body
  review.created_by = req.user.id

  await Task.setReview(req.params.task, review)

  const task = await Task.get(req.params.task)

  res.model(task)
}

const patchAttention = async (req, res) => {
  req.access.deny('Client')

  expect(req.params.task).to.be.uuid
  expect(req.body.needs_attention).to.be.a('boolean')

  const task = await Task.get(req.params.task)
  task.needs_attention = req.body.needs_attention

  const updated = await Task.update(task)

  res.model(updated)
}

const getTask = async (req, res) => {
  req.access.deny('Client')

  expect(req.params.task).to.be.uuid

  const task = await Task.get(req.params.task)

  res.model(task)
}

function getRevision(req, res) {
  req.access.deny('Client')

  const rev = req.params.revision
  expect(rev).to.be.uuid

  Form.getRevision(rev, (err, submission) => {
    if (err)
      return res.error(err)

    res.model(submission)
  })
}

function addContext(req, res) {
  req.access.deny('Client')

  const context = req.body.context
  expect(context).to.be.an('object')

  Deal.saveContext({
    deal: req.params.id,
    user: req.user.id,
    context
  }, err => {
    if (err)
      return res.error(err)

    Deal.get(req.params.id, (err, deal) => {
      if (err)
        return res.error(err)

      res.model(deal)
    })
  })
}

const join = async (req, res, next) => {
  const task = await Task.get(req.params.task)
  const room = await promisify(Room.get)(task.room)

  if (room.users.includes(req.user.id))
    return await next()

  await promisify(Room.addUser)({
    inviting_id: false,
    user_id: req.params.user.id,
    room_id: task.room,
    notification_setting: 'E_NONE'
  })

  await next()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/deals', auth, createDeal)
  app.get('/deals', auth, getDeals)
  app.get('/deals/:id', auth, access, getDeal)
  app.patch('/deals/:id/listing', auth, access, patchListing)
  app.delete('/deals/:id', auth, access, deleteDeal)
  app.post('/deals/:id/context', auth, access, addContext)
  app.post('/deals/:id/roles', auth, access, addRole)
  app.post('/deals/:id/checklists', auth, access, addChecklist)
  app.post('/deals/:id/tasks', auth, access, addTask)
  app.get('/brands/:brand/deals', auth, brandDeals)
  app.get('/brands/:brand/deals/inbox', auth, brandInbox)

  app.put('/tasks/:task/submission', auth, am(join), am(submit))
  app.put('/tasks/:task/review', auth, am(join), am(setReview))
  app.get('/tasks/:task', auth, join, am(getTask))
  app.get('/tasks/:task/submission/:revision', auth, am(join), am(getRevision))

  app.patch('/tasks/:task/needs_attention', auth, am(join), am(patchAttention))
}

module.exports = router
