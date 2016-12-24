const expect = require('../utils/validator.js').expect

function getByFormstackId (req, res) {
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
  const form = req.body

  if (req.user.user_type !== 'Admin')
    return res.error(Error.Unauthorized())

  Form.create(form, (err, form) => {
    if (err)
      return res.error(err)

    res.model(form)
  })
}

function putForm(req, res) {
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
  const values = req.body

  const deal_id = req.params.deal
  const form_id = req.params.form
  expect(deal_id).to.be.uuid
  expect(form_id).to.be.uuid

  Form.submit(deal_id, form_id, req.user.id, values, (err, submission) => {
    if (err)
      return res.error(err)

    res.model(submission)
  })
}

function updateSubmission(req, res) {
  const values = req.body

  const submission_id = req.params.id
  expect(submission_id).to.be.uuid

  Form.updateSubmission(submission_id, req.user.id, values, (err, submission) => {
    if (err)
      return res.error(err)

    res.model(submission)
  })
}

function getRevision(req, res) {
  const rev = req.params.id
  expect(rev).to.be.uuid

  Form.getRevision(rev, (err, submission) => {
    if (err)
      return res.error(err)

    res.model(submission)
  })
}

function getSubmissions(req, res) {
  expect(req.params.deal).to.be.uuid

  Form.getSubmissionsByDeal(req.params.deal, (err, submissions) => {
    if (err)
      return res.error(err)

    res.collection(submissions)
  })
}

function getForms(req, res) {
  Form.getAll((err, forms) => {
    if (err)
      return res.error(err)

    res.collection(forms)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/forms', b(createForm))
  app.get('/forms', b(getForms))
  app.put('/forms/:id', b(putForm))
  app.get('/forms/:id', b(getForm))
  app.post('/deals/:deal/submissions/:form', b(submit))
  app.get('/deals/:deal/submissions', b(getSubmissions))
  app.put('/forms/submissions/:id', b(updateSubmission))
  app.get('/forms/submissions/revision/:id', b(getRevision))
  app.get('/forms/search', b(getByFormstackId))
}

module.exports = router