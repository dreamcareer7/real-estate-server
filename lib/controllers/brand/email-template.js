const BrandEmail = {
  ...require('../../models/Brand/email/get'),
  ...require('../../models/Brand/email/save')
}

const addEmail = async (req, res) => {
  const email = req.body
  email.brand = req.params.id
  email.created_by = req.user.id

  const saved = await BrandEmail.create(email)

  res.model(saved)
}

const getEmails = async (req, res) => {
  const emails = await BrandEmail.getByBrand(req.params.id)

  res.collection(emails)
}

const deleteEmail = async (req, res) => {
  await BrandEmail.delete(req.params.eid)

  res.status(204)
  res.end()
}

const updateEmail = async (req, res) => {
  const email = req.body
  email.id = req.params.eid

  const saved = await BrandEmail.update(email)

  res.model(saved)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/emails/templates', b, access, am(addEmail))
  app.get('/brands/:id/emails/templates', b, access, am(getEmails))
  app.delete('/brands/:id/emails/templates/:eid', b, access, am(deleteEmail))
  app.put('/brands/:id/emails/templates/:eid', b, access, am(updateEmail))
}

module.exports = router
