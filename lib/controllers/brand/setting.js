const BrandSettings = require('../../models/Brand/settings')

const setBrandSettings = async (req, res) => {
  const setting = {
    ...req.body,
    user: req.user,
    brand: req.params.id,
    key: req.params.key
  }

  await BrandSettings.set(setting)

  res.status(204)
  res.end()
}

const router = function ({app, b, access, am}) {
  app.put('/brands/:id/settings/:key', b, access, am(setBrandSettings))
}

module.exports = router
