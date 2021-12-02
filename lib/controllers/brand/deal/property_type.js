const { expect } = require('../../../utils/validator')

const BrandPropertyType = {
  ...require('../../../models/Brand/deal/property_type/save'),
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

const updatePropertyType = async (req, res) => {
  const property_type = await BrandPropertyType.update({
    id: req.params.pid,
    ...req.body
  })

  res.model(property_type)
}

const deletePropertyType = async (req, res) => {
  const property_type = await BrandPropertyType.get(req.params.pid)

  // Access Control Check
  expect(property_type.brand).to.equal(req.params.id)

  await BrandPropertyType.remove(req.params.pid)

  res.status(204)
  return res.end()
}

const sortPropertyTypes = async (req, res) => {
  const items = req.body

  const property_types = await BrandPropertyType.getAll(items.map(i => i.id))

  await BrandPropertyType.sort(items)

  for(const property_type of property_types)
    expect(property_type.brand).to.equal(req.params.id)

  res.status(200)
  res.end()
}

const router = function ({app, b, access, am}) {
  app.post('/brands/:id/deals/property_types', b, access, am(createPropertyType))
  app.put('/brands/:id/deals/property_types/sort', b, access, am(sortPropertyTypes))
  app.put('/brands/:id/deals/property_types/:pid', b, access, am(updatePropertyType))
  app.delete('/brands/:id/deals/property_types/:pid', b, access, am(deletePropertyType))
  app.get('/brands/:id/deals/property_types', b, access, am(getPropertyTypes))
}

module.exports = router
