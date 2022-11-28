const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware')
const Form = require('../models/Form')
const Brand = require('../models/Brand')
const AttachedFile = require('../models/AttachedFile')
const User = require('../models/User/get')
const Submission = require('../models/Form/submission')
const Agent = require('../models/Agent/get')

const getForm = async (req, res) => {
  const id = req.params.id
  expect(id).to.be.uuid

  const form = await Form.get(id)
  res.model(form)
}

const createForm = async (req, res) => {
  const form = await Form.create(req.body)
  res.model(form)
}

const putForm = async (req, res) => {
  expect(req.params.id).to.be.uuid

  const form = await Form.update(req.params.id, req.body)
  res.model(form)
}

const getForms = async (req, res) => {
  await Brand.limitAccess({
    user: req.user.id,
    brand: req.params.brand,
  })

  const forms = await Form.getByBrand(req.params.brand)
  res.collection(forms)
}

const generatePdf = async (req, res) => {
  const params = req.params
  expect(params.form).to.be.uuid
  const agent_id = req.params.agent ?? req.user.agents[0]

  expect(agent_id).to.be.uuid
  expect(req.user.agents).to.include(agent_id)

  const agent = await Agent.get(agent_id)
  const form = await Form.get(params.form)
  const brand = await Brand.get(params.brand)
  const submission = await Form.generate({form, brand, agent, user: req.user})
  const rev = await Submission.getRevision(submission.last_revision)
  const file = await AttachedFile.get(rev.file)
  res.redirect(file.url)
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/brands/:brand/forms', auth, am(getForms))
  app.get('/brands/:brand/forms/:form', auth, generatePdf)
  app.post('/forms', auth, am(createForm))
  app.put('/forms/:id', auth, am(putForm))
  app.get('/forms/:id', auth, am(getForm))
}

module.exports = router
