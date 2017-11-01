const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const promisify = require('../utils/promisify')
const async = require('async')

function getDeal (req, res) {
  const id = req.params.id

  expect(id).to.be.uuid

  Deal.get(id, function (err, deal) {
    if (err)
      return res.error(err)

    res.model(deal)
  })
}

function getDeals (req, res) {
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

function createDeal(req, res) {
  const deal = req.body

  deal.created_by = req.user.id

  Deal.create(deal, (err, deal) => {
    if (err)
      return res.error(err)

    Deal.notify({deal, action: Deal.CREATED}).nodeify(err => {
      if (err)
        return res.error(err)


      res.model(deal)
    })

  })
}

function deleteDeal(req, res) {
  const deal_id = req.params.id

  expect(deal_id).to.be.uuid

  Deal.delete(deal_id, err => {
    if(err)
      return res.error(err)

    Deal.notifyById(deal_id, Deal.DELETED).nodeify(err => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
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
  }, err => {
    if (err)
      return res.error(err)

    next()
  })
}

function addRoles(req, res) {
  const roles = req.body.roles

  expect(roles).to.be.a('array')

  function add(role, cb) {
    role.created_by = req.user.id
    role.deal = req.params.id

    expect(role.deal).to.be.uuid
  
    Deal.addRole(role, cb)  
  }

  function done(err) {
    if (err)
      return res.error(err)

    Deal.notifyById(req.params.id).nodeify((err, deal) => {
      if (err)
        return res.error(err)

      res.model(deal)
    })
  }

  async.each(roles, add, done)
}

function deleteRole(req, res) {
  const role_id = req.params.rid

  expect(role_id).to.be.uuid

  DealRole.delete(role_id, err => {
    if(err)
      return res.error(err)

    Deal.notifyById(req.params.id).nodeify(err => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  })
}

function patchListing(req, res) {
  const { listing } = req.body

  Deal.get(req.params.id, (err, deal) => {
    if (err)
      return res.error(err)

    deal.listing = listing

    Deal.update(deal, err => {
      if (err)
        return res.error(err)

      Deal.notifyById(req.params.id).nodeify((err, deal) => {
        if (err)
          return res.error(err)

        res.model(deal)
      })
    })
  })
}

const addTask = async (req, res) => {
  const task = req.body
  task.deal = req.params.id

  const saved = await Task.create(task)

  await Deal.notifyById(task.deal)

  res.model(saved)
}

const addChecklist = async (req, res) => {
  const checklist = req.body
  checklist.deal = req.params.id

  const saved = await DealChecklist.create(checklist)

  await Deal.notifyById(checklist.deal)

  res.model(saved)
}

const offerChecklist = async (req, res) => {
  const { checklist, conditions } = req.body
  checklist.deal = req.params.id

  const saved = await DealChecklist.offer(checklist, conditions)

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
  const task = await Task.get(task_id)
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
  expect(req.body.needs_attention).to.be.a('boolean')

  const task = await Task.get(req.params.task)
  task.needs_attention = req.body.needs_attention

  const updated = await Task.update(task)

  await Deal.notifyById(updated.deal)

  res.model(updated)
}

const getTask = async (req, res) => {
  expect(req.params.task).to.be.uuid

  const task = await Task.get(req.params.task)

  res.model(task)
}

function getRevision(req, res) {
  const rev = req.params.revision
  expect(rev).to.be.uuid

  Form.getRevision(rev, (err, submission) => {
    if (err)
      return res.error(err)

    res.model(submission)
  })
}

function addContext(req, res) {
  const context = req.body.context
  expect(context).to.be.an('object')

  const approved = Boolean(req.body.approved)

  Deal.saveContext({
    deal: req.params.id,
    user: req.user.id,
    context,
    approved
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

  const saved = await promisify(Activity.postToRoom)({
    room_id: task.room,
    activity
  })

  return res.model(saved)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/deals', auth, createDeal)
  app.get('/deals', auth, getDeals)
  app.post('/deals/filter', auth, am(filterDeals))

  app.get('/deals/:id', auth, access, getDeal)
  app.patch('/deals/:id/listing', auth, access, patchListing)
  app.delete('/deals/:id', auth, access, deleteDeal)
  app.post('/deals/:id/context', auth, access, addContext)
  app.patch('/deals/:id/context/:cid/approved', auth, access, approveContext)
  app.post('/deals/:id/roles', auth, access, addRoles)
  app.delete('/deals/:id/roles/:rid', auth, access, deleteRole)
  app.post('/deals/:id/checklists', auth, access, am(addChecklist))
  app.post('/deals/:id/checklists/offer', auth, access, am(offerChecklist))
  app.put('/deals/:id/checklists/:cid', auth, access, am(updateChecklist))
  app.post('/deals/:id/tasks', auth, access, addTask)
  app.get('/brands/:brand/deals', auth, brandDeals)
  app.get('/brands/:brand/deals/inbox', auth, brandInbox)

  app.put('/tasks/:task/submission', auth, am(join), am(submit))
  app.put('/tasks/:task/review', auth, am(join), am(setReview))
  app.get('/tasks/:task', auth, join, am(getTask))
  app.get('/tasks/:task/submission/:revision', auth, am(join), am(getRevision))
  app.post('/tasks/:task/timeline', auth, am(join), am(timeline))

  app.patch('/tasks/:task/needs_attention', auth, am(join), am(patchAttention))
}

module.exports = router
