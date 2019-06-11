const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware')

const getForm = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const form = await Form.get(id)
  res.model(form)
}

const createForm = async (req, res) => {
  req.access.allow('Admin')

  const form = await Form.create(req.body)
  res.model(form)
}

const putForm = async (req, res) => {
  req.access.allow('Admin')

  expect(req.params.id).to.be.uuid

  const form = await Form.update(req.params.id, req.body)
  res.model(form)
}

const getForms = async (req, res) => {
  Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  })

  const forms = await Form.getByBrand(req.params.brand)
  res.collection(forms)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/brands/:brand/forms', auth, am(getForms))
  app.post('/forms', auth, am(createForm))
  app.put('/forms/:id', auth, am(putForm))
  app.get('/forms/:id', auth, am(getForm))
}

module.exports = router
