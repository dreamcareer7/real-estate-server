const db = require('../../utils/db.js')
const Orm = require('../Orm')

const CrmTask = require('../../../lib/models/CRM/Task')
const { Listing } = require('../../../lib/models/Listing')
const Deal = require('../../../lib/models/Deal')

const Showings = {}


Showings.create = async (showing, task) => {
  let crm_task_id

  const description = `Note:${showing.note_text}\n\nFeedback:${showing.feedback_text}\n\nCancellation-Reason:${showing.cancellation_reason}`
  const metadata = {
    remote_agent: {
      name: showing.remote_agent_name,
      email: showing.remote_agent_email,
      description: showing.remote_agent_desc,
      phone: showing.remote_agent_phone
    }
  }

  const currentShowing = await Showings.getByRemoteId(showing.remote_id)

  if( currentShowing ) {
    const currentTask = await CrmTask.get(currentShowing.crm_task)
    crm_task_id = currentTask.id

    const taskUpdateBody = {
      title: task.title,
      due_date: task.due_date,
      status: task.status,
      task_type: task.task_type,

      description: description,
      metadata: metadata
    }

    await CrmTask.update(crm_task_id, taskUpdateBody, currentTask.created_by)

  } else {

    let associations = null
    let listing

    try {
      // if listing is null then dont add as association
      listing = await Listing.getByMLSNumber(showing.mls_number)
    } catch(ex) {
      // do nothing
    }

    if(listing) {      
      associations = [{
        association_type: 'listing',
        listing: listing.id
      }]

      // if deal found, then just add deal to association
      // const deals = await Deal.getByListingId(listing.id, task.brand)

      const filter = {
        brand: task.brand,
        listing: listing.id
      }
    
      const deals = await Deal.filter({
        filter,
        user: task.user
      })

      if(deals) {
        associations = deals.map(deal => ({
          association_type: 'deal',
          contact: deal.id
        }))
      }
    }

    const taskBody = {
      brand: task.brand,
      assignees: [task.user],
      created_by: task.user,

      title: task.title,
      due_date: task.due_date,
      status: task.status,
      task_type: task.task_type,

      description: description,
      metadata: metadata
    }

    if(associations !== null)
      taskBody['associations'] = associations

    const createdTask = await CrmTask.create(taskBody)
    crm_task_id = createdTask.id
  }

  const showingId = await db.selectId('showing/insert', [
    crm_task_id,
    showing.credential_id,
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
  ])

  return showingId
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

Showings.getByRemoteId = async (remoteId) => {
  const ids = await db.select('showing/get_by_remote_id', [remoteId])

  if (ids.length < 1)
    return null

  return Showings.get(ids[0].id)
}

Showings.getOneByCredential = async (credentialId) => {
  const ids = await db.select('showing/get_by_credential', [credentialId])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`showings by agent ${credentialId} not found`)

  return Showings.get(ids[0].id)
}

Showings.getManyByCredential = async (credentialId) => {
  let ids = await db.select('showing/get_by_credential', [credentialId])

  ids = ids.map(function (record) {
    return record.id
  })

  return Showings.getAll(ids)
}

Showings.delete = async (showingId) => {
  await db.query.promise('showing/delete', [showingId])
}


Orm.register('showings', 'Showings', Showings)

module.exports = Showings