const db = require('../../utils/db.js')

const Showings = {}
global['Showings'] = Showings




Showings.create = async function(showing) {
  return db.selectId(
    'showing/insert',
    [
      showing.agent,
      showing.mls_number,
      showing.mls_title,
      showing.showing_start_date,
      showing.showing_end_date,
      showing.remote_agent_id,
      showing.remote_agent_name,
      showing.remote_agent_email,
      showing.remote_agent_desc,
      showing.remote_agent_phone_office,
      showing.remote_agent_phone_cell,
      showing.result,
      showing.feedback_text,
      showing.feedback_id,
      showing.cancellation_reason,
      showing.note_text,
      showing.note_id
    ]
  )
}

Showings.getAll = async ids => {
  return db.select('showing/get', [ids])
}

Showings.get = async id => {
  const campaigns = await Showings.getAll([id])

  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}

Showings.getByAgent = async id => {
  const campaigns = await Showings.getAll([id])

  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}

Showings.update = async function(showingId, showing, cb) {
  db.query(
    'showing/update',
    [
      showing.username,
      showing.password,
      showingId
    ],
    cb
  )
}

Showings.delete = function(showingId, cb) {
  db.query('showing/delete', [showingId], cb)
}



module.exports = Showings