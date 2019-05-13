const db = require('../../utils/db.js')
const Orm = require('../Orm')

const Showings = {}


Showings.create = async (showing) => {
  return db.selectId(
    'showing/insert',
    [
      showing.agent,
      showing.remote_id,
      showing.mls_number,
      showing.mls_title,
      showing.date_raw,
      showing.start_date,
      showing.end_date,
      showing.remote_agent_name,
      showing.remote_agent_email,
      showing.remote_agent_desc,
      showing.remote_agent_phone,
      showing.result,
      showing.feedback_text,
      showing.cancellation_reason,
      showing.note_text
    ]
  )
}

Showings.getAll = async (ids) => {
  const showings = await db.select('showing/get', [ids])

  return showings
}

Showings.get = async (id) => {
  const showings = await Showings.getAll([id])

  if (showings.length < 1)
    throw Error.ResourceNotFound(`showings ${id} not found`)

  return showings[0]
}

Showings.getByAgent = async (agentId) => {
  const ids = await db.select('showing/getByAgent', [agentId])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`showings by agent ${agentId} not found`)

  return Showings.get(ids[0].id)
}

Showings.update = async (showingId, showing) => {
  return db.update('showing/update', [
    showing.result,
    showing.feedback_text,
    showingId
  ])
}

Showings.delete = async (showingId) => {
  await db.query.promise('showing/delete', [showingId])
}


Orm.register('showings', 'Showings', Showings)

module.exports = Showings