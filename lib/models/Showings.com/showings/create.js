const db = require('../../../utils/db.js')

const Context = require('../../Context')
const User    = require('../../User/get')
const Deal    = require('../../Deal/filter')
const CrmTask = require('../../CRM/Task')
const { Listing }       = require('../../Listing')
const { getByRemoteId } = require('./get')


const create = async (showing, task) => {
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

  let currentShowing = null
  try {
    currentShowing = await getByRemoteId(showing.remote_id)
  } catch(ex) {
    // do nothing
    Context.log('Showings create-Failed', ex)
  }

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
    let listing = null

    try {
      // Listing.getByMLSNumber Throw Exceprion if could not find listing
      // if listing is null then dont add as association
      listing = await Listing.getByMLSNumber(showing.mls_number)
    } catch(ex) {
      // do nothing
      Context.log('Showings create-Failed', ex)
    }

    if(listing) {      
      associations = [{
        association_type: 'listing',
        listing: listing.id
      }]

      // if deal found, then just add deal to association
      const filter = { listing: listing.id }
      const user = await User.get(task.user)
      const deals = await Deal.filter({ filter, user })

      if(deals) {
        associations = deals.map(deal => ({
          association_type: 'deal',
          deal: deal.id
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

  const showingId = await db.selectId('showings.com/insert', [
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


module.exports = {
  create
}
