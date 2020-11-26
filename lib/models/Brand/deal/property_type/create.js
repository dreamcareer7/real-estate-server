const db = require('../../../../utils/db')

const { get } = require('./get')

const create = async property_type => {
  const id = await db.insert('brand/deal/property_type/insert', [
      property_type.brand,
      property_type.label,
      property_type.is_lease || false
  ])

  return get(id)
}

module.exports = {
  create
}
