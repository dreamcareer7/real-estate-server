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

const update = async property_type => {
  await db.query.promise('brand/deal/property_type/update', [
    property_type.id,
    property_type.label,
    property_type.is_lease || false
  ])

  return get(property_type.id)
}

const remove = async property_type => {
  return db.query.promise('brand/deal/property_type/remove', [
    property_type.id,
  ])
}

module.exports = {
  create,
  update,
  remove
}
