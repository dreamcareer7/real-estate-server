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

  const activity = {
    action: 'UserChangedFormName',
    object: form,
    object_class: 'form'
  }

  Form.update(req.params.id, form, (err, form) => {
    if (err)
      return res.error(err)

    Activity.add(req.user.id, 'User', activity, () => {})

    res.model(form)
  })
}

function getForms(req, res) {
  Form.getAllForms((err, forms) => {
    if (err)
      return res.error(err)

    res.collection(forms)
  })
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/forms/search', auth, getByFormstackId)
  app.post('/forms', auth, createForm)
  app.get('/forms', auth, getForms)
  app.put('/forms/:id', auth, putForm)
  app.get('/forms/:id', auth, getForm)
}

module.exports = router
