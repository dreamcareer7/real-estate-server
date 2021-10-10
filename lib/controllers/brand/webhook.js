const BrandWebhook = {
  ...require('../../models/Brand/webhook/save'),
  ...require('../../models/Brand/webhook/get')
}

const create = async (req, res) => {
  const saved = await BrandWebhook.create({
    ...req.body,
    brand: req.params.id
  })

  res.model(saved)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/webhooks', b, access, am(create))
}

module.exports = router
