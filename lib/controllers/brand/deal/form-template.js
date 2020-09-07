const expect = require('../../../utils/validator').expect

const FormTemplate = {
  ...require('../../../models/Brand/form/template/save'),
  ...require('../../../models/Brand/form/template/get')
}

const createTemplate = async (req, res) => {
  const { form, field } = req.params

  const template = {
    ...req.body,
    form,
    field,
    brand: req.params.id,
    created_by: req.user.id
  }

  const saved = await FormTemplate.save(template)

  res.model(saved)
}

const getTemplates = async (req, res) => {
  expect(req.params.form).to.be.uuid

  const templates = await FormTemplate.getByForm({
    brand: req.params.id,
    form: req.params.form
  })

  res.collection(templates)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/forms/templates/:form/:field', b, access, am(createTemplate))
  app.get('/brands/:id/forms/templates/:form', b, access, am(getTemplates))
}

module.exports = router
