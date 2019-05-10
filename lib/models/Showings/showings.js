const db = require('../../utils/db.js')
const Orm = require('../Orm')

const Showings = {}
global['Showings'] = Showings



Showings.create = async function(showing) {
  return db.selectId(
    'showing/insert',
    [
      showing.agent,
      showing.showing_id,
      showing.mls_number,
      showing.mls_title,
      showing.showing_date,
      showing.showing_start_date,
      showing.showing_end_date,
      showing.remote_agent_name,
      showing.remote_agent_email,
      showing.remote_agent_desc,
      showing.remote_agent_phone_office,
      showing.remote_agent_phone_cell,
      showing.result,
      showing.feedback_text,
      showing.cancellation_reason,
      showing.note_text
    ]
  )
}

Showings.getAll = async ids => {
  return db.select('showing/get', [ids])
}

Showings.get = async id => {
  const showings = await Showings.getAll([id])

  if (showings.length < 1)
    throw Error.ResourceNotFound(`showings ${id} not found`)

  return showings[0]
}

Showings.getByAgent = async agentId => {
  const showings = await db.select('showing/getByAgent', [agentId])

  if (showings.length < 1)
    throw Error.ResourceNotFound(`showings by agentId ${agentId} not found`)

  return showings[0]
}

Showings.update = async function(showingId, showing, cb) {
  return db.update('showing/update', [
    showing.result,
    showing.feedback_text,
    showingId
  ])
}

Showings.delete = async function(showingId, cb) {
  await db.query.promise('showing/delete', [showingId])
}


Orm.register('showings', 'Showings', Showings)

module.exports = Showings