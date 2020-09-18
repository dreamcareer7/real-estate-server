const db = require('../../../utils/db')
const Brand = require('../index')

const getDefault = async () => {
  const [ brand ] = await db.selectIds('brand/default/get')
  if (brand)
    return Brand.get(brand)

  const brand = {
    name: 'Default Brand',
    brand_type: 'Brokerage'
  }

  const saved = await Brand.create(brand)

  await db.query.promise('brand/default/set', [saved.id])

  return Brand.get(saved.id)
}

module.exports = {
  getDefault
}
