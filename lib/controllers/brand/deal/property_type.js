const expect = require('../../../utils/validator').expect

const BrandPropertyType = {
  ...require('../../../models/Brand/deal/property_type/create'),
  ...require('../../../models/Brand/deal/property_type/get')
}

const createPropertyType = async (req, res) => {
  const property_type = req.body

  const saved = await BrandPropertyType.create({
    ...property_type,
    brand: req.params.id
  })

  res.model(saved)
}

const getPropertyTypes = async (req, res) => {
  const property_types = await BrandPropertyType.getByBrand(req.params.id)

  res.collection(property_types)
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/deals/property_types', b, access, am(createPropertyType))
  app.get('/brands/:id/deals/property_types', b, access, am(getPropertyTypes))
}

module.exports = router
