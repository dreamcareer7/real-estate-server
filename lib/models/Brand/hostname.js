const db = require('../../utils/db')

Brand.addHostname = async ({brand, hostname, is_default}) => {
  const res = await db.query.promise('brand/hostname/add', [
    brand,
    hostname,
    is_default
  ])

  return Brand.get(brand)
}

Brand.removeHostname = async (brand, hostname) => {
  const res = await db.query.promise('brand/hostname/remove', [
    brand,
    hostname
  ])

  return Brand.get(brand)
}

Brand.getByHostname = async hostname => {
  const res = await db.query.promise('brand/hostname/get', [hostname])

  if (res.rows.length < 1)
    return new Error.ResourceNotFound('Brand ' + hostname + ' not found')

  return Brand.get(res.rows[0].brand)
}