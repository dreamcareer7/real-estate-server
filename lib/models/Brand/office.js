const db = require('../../utils/db')

Brand.addOffice = async ({brand, office}) => {
  await db.query.promise('brand/office/add', [
    brand,
    office
  ])

  return Brand.get(brand)
}

Brand.removeOffice = async (brand, office) => {
  await db.query.promise('brand/office/remove', [
    brand,
    office
  ])

  return Brand.get(brand)
}