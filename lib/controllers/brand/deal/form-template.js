const expect = require('../../../utils/validator').expect

const FormTemplate = {
  ...require('../../../models/Brand/form/template/save'),
  ...require('../../../models/Brand/form/template/get')
}

const createTemplate = async (req, res) => {
  const template = req.body

  const saved = await FormTemplate.create({
    ...template,
    brand: req.params.id,
    created_by: req.user.id
  })

  res.model(saved)
}

const updateTemplate = async (req, res) => {
  const template = req.body

  const updated = await FormTemplate.update({
    ...template,
    id: req.params.template,
    updated_by: req.user.id
  })

  res.model(updated)
}

const getTemplates = async (req, res) => {
  expect(req.query.form).to.be.uuid

  const templates = await FormTemplate.getByForm({
    brand: req.params.id,
    form: req.query.form
  })

  res.collection(templates)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/forms/templates', b, access, am(createTemplate))
  app.get('/brands/:id/forms/templates', b, access, am(getTemplates))
  app.put('/brands/:id/forms/templates/:template', b, access, am(updateTemplate))
}

module.exports = router
