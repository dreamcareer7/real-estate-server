const BrandAsset = {
  ...require('../../models/Brand/asset/get'),
  ...require('../../models/Brand/asset/save'),
  ...require('../../models/Brand/asset/share'),
}

const Brand = require('../../models/Brand/access')

const { expect } = require('../../utils/validator')

const createAssets = async (req, res) => {
  const assets = await BrandAsset.createFromRequest(req)

  // This endpoint can upload an asset for different brands due to #1948
  // Thus, it can't take a single brand id in url and use the `access` middleware like other brand-based endpoints.
  // So here is the access control fo it
  const brands = assets.map(a => a.brand)

  for(const brand of brands)
    await Brand.limitAccess({
      brand,
      user: req.user.id
    })

  res.collection(assets)
}

const getAssets = async (req, res) => {
  const { template_types, mediums } = req.query

  const assets = await BrandAsset.getByBrand({
    brands: [req.params.id],
    template_types
    mediums
  })
  res.collection(assets)
}

const deleteAsset = async (req, res) => {
  const asset = await BrandAsset.get(req.params.asset)

  expect(asset.brand).to.equal(req.params.id)

  await BrandAsset.delete(asset.id)

  res.status(204)
  res.end()
}

const share = async (req, res) => {
  const asset = await BrandAsset.get(req.params.asset)

  await BrandAsset.share({
    ...req.body,
    asset
  })

  res.model(asset)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/assets', b, am(createAssets))
  app.get('/brands/:id/assets', b, access, am(getAssets))
  app.delete('/brands/:id/assets/:asset', b, access, am(deleteAsset))
  app.post('/brands/:id/assets/:asset/share', b, am(share))
}

module.exports = router
