const db = require('../../../../utils/db')

const roles = require('./roles')

const getDefinition = role => roles[role]

const setRoles = checklist => {
  checklist.required_roles = checklist.required_roles?.map(getDefinition)
  checklist.optional_roles = checklist.optional_roles?.map(getDefinition)
}


const get = async id => {
  const contexts = await getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Brand Property Type ${id} not found`)

  return contexts[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/deal/property_type/get', [ids])

  res.rows.forEach(setRoles)

  return res.rows
}

const getByBrand = async brand => {
  const res = await db.query.promise('brand/deal/property_type/by-brand', [brand])

  const ids = res.rows.map(r => r.id)

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrand
}
