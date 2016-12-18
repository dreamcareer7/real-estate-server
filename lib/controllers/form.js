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

  const form_id = req.params.id
  expect(form_id).to.be.uuid

  Form.submit(form_id, req.user.id, values, (err, submission) => {
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

const router = function (app) {
  const b = app.auth.bearer

  app.post('/forms', b(createForm))
  app.put('/forms/:id', b(putForm))
  app.post('/forms/:id/submissions', b(submit))
  app.put('/forms/submissions/:id', b(updateSubmission))
  app.get('/forms/search', b(getByFormstackId))
}

module.exports = router