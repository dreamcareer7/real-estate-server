const db = require('../../utils/db')
const Agent = require('../Agent')

const getAll = async office_ids => {
  const res = await db.query.promise('office/get', [office_ids])
  return res.rows
}

const get = async id => {
  const offices = await getAll([id])

  if (offices.length < 1)
    throw Error.ResourceNotFound(`Office ${id} not found`)

  return offices[0]
}

const getByMLS = async (id, mls = undefined) => {
  const res = await db.query.promise('office/get_mls', [id, mls || null])

  if (res.rows.length < 1)
    throw Error.ResourceNotFound(`Office ${id} not found`)

  const office = res.rows[0]

  // TODO: WTF? Associations please?
  const agents = await Agent.getByOfficeId(office.mls_id, office.mls)
  office.agents = agents

  return office
}

const search = async (query, mls = undefined) => {
  const res = await db.query.promise('office/search', [query, mls || null])
  return getAll(res.rows.map(r => r.id))
}

module.exports = {
  get,
  getAll,
  getByMLS,
  search
}
