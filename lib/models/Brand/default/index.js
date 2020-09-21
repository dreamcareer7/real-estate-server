const db = require('../../../utils/db')
const Brand = require('../index')

const getDefault = async () => {
  const [ brand ] = await db.selectIds('brand/default/get')
  if (brand)
    return Brand.get(brand)

  const { id } = await Brand.create({
    name: 'Default Brand',
    brand_type: 'Brokerage'
  })

  await db.query.promise('brand/default/set', [id])

  return Brand.get(id)
}

module.exports = {
  getDefault
}
