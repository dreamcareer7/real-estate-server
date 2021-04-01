const Brand = require('../../../lib/models/Brand')
const db = require('../../../lib/utils/db')

const SET = `WITH bs AS (
  UPDATE brand_settings SET brand = $1, id = $1 WHERE id = $2
)
UPDATE brands SET id = $1 WHERE id = $2 RETURNING *`

module.exports = async () => {
  const id = '96a6ca28-0281-11eb-b7a9-1650ce91b517'

  try {
    const brand = await Brand.get(id)
    return brand
  } catch(e) {
    const brand = await Brand.create({
      name: 'Douglas Elliman',
      brand_type: Brand.BROKERAGE
    })

    await db.executeSql.promise(SET, [
      id,
      brand.id
    ])

    brand.id = id

    return brand
  }
}
