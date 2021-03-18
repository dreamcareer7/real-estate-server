const BrandSettings = {
  ...require('../../models/Brand/settings/set'),
  ...require('../../models/Brand/settings/get')
}

const setBrandSettings = async (req, res) => {
  const setting = {
    value: req.body.value,
    user: req.user,
    brand: req.params.id,
    key: req.params.key
  }

  await BrandSettings.set(setting)

  const settings = await BrandSettings.getByBrand(req.params.id)
  res.model(settings)
}

const router = function ({app, b, access, am}) {
  app.put('/brands/:id/settings/:key', b, access, am(setBrandSettings))
}

module.exports = router
