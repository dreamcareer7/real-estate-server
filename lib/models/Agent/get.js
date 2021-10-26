const GLibPhone = require('google-libphonenumber')
const db = require('../../utils/db')

const pnu = GLibPhone.PhoneNumberUtil.getInstance()

const formatPhone = string => {
  try {
    const p = pnu.parse(string, 'US')
    return pnu.format(p, GLibPhone.PhoneNumberFormat.NATIONAL)
  } catch(e) {
    return ''
  }
}

const get = async id => {
  const agents = await getAll([id])

  if (agents.length < 1)
    throw Error.ResourceNotFound(`Agent ${id} not found`)

  return agents[0]
}

const getAll = async ids => {
  /** @type {IAgent[]} */
  const rows = await db.select('agent/get', [ids])

  // agent.emails and agent.phone_numbers must be populated by sql.
  // However, that depends on certain materialized views being refreshed (agents_emails and agents_phone)
  // If (for any reason they have not been refreshed yet, populate the arrays with the least information we have

  const agents = rows

  for(const agent of agents) {
    if (!agent.phone_numbers && agent.phone_number)
      agent.phone_numbers = [agent.phone_number]

    if (!agent.emails && agent.email)
      agent.emails = [agent.email]

    if (agent.phone_numbers)
      agent.phone_numbers = agent.phone_numbers.map(formatPhone)
  }

  return agents
}

const getByMLSID = async id => {
  const { rows } = await db.query.promise('agent/get_mlsid', [id])

  if (rows.length < 1)
    return []

  const ids = rows.map(r => r.id)

  return getAll(ids)
}

const getByOfficeId = async (office_mls, mls) => {
  const { rows } = await db.query.promise('agent/office_mls', [office_mls, mls])

  const ids = rows.map(a => a.id)

  const agents = await getAll(ids)

  if (agents.length > 0)
    agents[0].total = rows[0].total

  return agents
}

module.exports = {
  get,
  getAll,
  getByMLSID,
  getByOfficeId,
}
