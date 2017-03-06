const expect = require('../utils/validator.js').expect

function getByFormstackId (req, res) {
  req.access.allow('Admin')

  const formstack_id = req.query.formstack_id
  expect(formstack_id).to.be.a('string')

  Form.getByFormstackId(formstack_id, function (err, form) {
    if (err)
      return res.error(err)

    res.model(form)
  })
}

function getForm (req, res) {
  const id = req.params.id
  expect(id).to.be.uuid

  Form.get(id, function (err, form) {
    if (err)
      return res.error(err)

    res.model(form)
  })
}

function createForm(req, res) {
  req.access.allow('Admin')

  const form = req.body

  Form.create(form, (err, form) => {
    if (err)
      return res.error(err)

    res.model(form)
  })
}

function putForm(req, res) {
  req.access.allow('Admin')

  const form = req.body

  if (req.user.user_type !== 'Admin')
    return res.error(Error.Unauthorized())

  expect(req.params.id).to.be.uuid

  Form.update(req.params.id, form, (err, form) => {
    if (err)
      return res.error(err)

    res.model(form)
  })
}

function submit(req, res) {
  req.access.deny('Client')

  const values = req.body.values
  const state = req.body.state

  const deal_id = req.params.deal
  const form_id = req.body.form
  expect(deal_id).to.be.uuid
  expect(form_id).to.be.uuid
  expect(values).to.be.an('object')
  expect(state).to.be.a('string')

  const submission = {
    deal_id,
    form_id,
    user_id: req.user.id,
    values,
    state
  }

  Form.submit(submission, (err, submission) => {
    if (err)
      return res.error(err)

    res.model(submission)
  })
}

function updateSubmission(req, res) {
  req.access.deny('Client')

  const values = req.body.values
  const state = req.body.state

  const submission_id = req.params.id
  expect(submission_id).to.be.uuid
  expect(state).to.be.string

  const submission = {
    submission_id,
    user_id: req.user.id,
    values,
    state
  }

  Form.updateSubmission(submission, (err, submission) => {
    if (err)
      return res.error(err)

    // Throwing the error causes a ROLLBACK
    if (submission.author !== req.user.id)
      return res.error(Error.Unauthorized())

    res.model(submission)
  })
}

function getRevision(req, res) {
  req.access.deny('Client')

  const rev = req.params.id
  expect(rev).to.be.uuid

  Form.getRevision(rev, (err, submission) => {
    if (err)
      return res.error(err)

    Deal.limitAccess({
      user: req.user,
      deal_id: submission.deal
    }, err => {
      if (err)
        res.error(err)

      res.model(submission)
    })
  })
}

function getSubmissions(req, res) {
  req.access.deny('Client')

  expect(req.params.deal).to.be.uuid

  Deal.get(req.params.deal, (err, deal) => {
    if (err)
      res.error(err)

    Form.getSubmissionsByDeal(req.params.deal, (err, submissions) => {
      if (err)
        return res.error(err)

      res.collection(submissions)
    })
  })
}

function getForms(req, res) {
  if (!req.user.features || req.user.features.indexOf('Deals') < 0)
    return res.collection([])

  Form.getAll((err, forms) => {
    if (err)
      return res.error(err)

    res.collection(forms)
  })
}

function deleteSubmission(req, res) {
  const submission_id = req.params.id

  expect(submission_id).to.be.uuid

  Form.deleteSubmission(submission_id, err => {
    if(err)
      return res.error(err)

    res.status(200)
    return res.end()
  })
}

const access = (req, res, next) => {
  expect(req.params.deal).to.be.uuid

  Deal.limitAccess({
    user: req.user,
    deal_id: req.params.deal
  }, err => {
    if (err)
      res.error(err)

    next()
  })
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/forms/search', auth, getByFormstackId)
  app.post('/forms', auth, createForm)
  app.get('/forms', auth, getForms)
  app.put('/forms/:id', auth, putForm)
  app.get('/forms/:id', auth, getForm)
  app.post('/deals/:deal/submissions', auth, access, submit)
  app.get('/deals/:deal/submissions', auth, access, getSubmissions)
  app.put('/forms/submissions/:id', auth, updateSubmission)
  app.delete('/forms/submissions/:id', auth, deleteSubmission)
  app.get('/forms/submissions/revisions/:id', auth, getRevision)
}

module.exports = router
