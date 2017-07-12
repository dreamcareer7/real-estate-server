const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')

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

  if (!deal.listing && !(deal.context && deal.context.full_address))
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

  const a = await Task.setReview(req.params.task, review)

  console.log(a)

  const task = await Task.get(req.params.task)

  console.log(task)

  res.model(task)
}


const getTask = async (req, res) => {
  req.access.deny('Client')

  expect(req.params.task).to.be.uuid

  const task = await Task.get(req.params.task)

  res.model(task)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/deals', auth, createDeal)
  app.get('/deals', auth, getDeals)
  app.get('/deals/:id', auth, access, getDeal)
  app.delete('/deals/:id', auth, access, deleteDeal)
  app.post('/deals/:id/roles', auth, access, addRole)
  app.post('/deals/:id/tasks', auth, access, addTask)
  app.get('/brands/:brand/deals', auth, brandDeals)

  app.put('/tasks/:task/submission', auth, am(submit))
  app.put('/tasks/:task/review', auth, am(setReview))
  app.get('/tasks/:task', auth, am(getTask))
}

module.exports = router
