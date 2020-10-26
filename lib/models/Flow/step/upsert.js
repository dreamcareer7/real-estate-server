const _ = require('lodash')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const Context = require('../../Context')
const CrmTask = require('../../CRM/Task')
const EmailCampaign = require('../../Email/campaign/delete')


/**
 * @param {UUID} brand_id 
 * @param {UUID} user_id 
 * @param {number} epoch 
 * @param {UUID[]} brand_step_ids 
 * @param {IFlowStepInput[]} steps 
 */
const create = async (brand_id, user_id, epoch, brand_step_ids, steps) => {
  Context.log(`Creating ${steps.length} steps`)

  const data = steps
    .filter(s => s.email || s.event)
    .map(step => ({
      flow: step.flow,
      origin: step.origin,
      event: step.event,
      email: step.email,
      created_by: user_id
    }))

  const q = sq.insert({ autoQuoteFieldNames: true })
    .into('flows_steps')
    .setFieldsRows(data)
    .returning('id')

  // @ts-ignore
  q.name = 'flow/step/create'

  return db.selectIds(q, [])
}

/**
 * @typedef IDeleteReturnType
 * @prop {UUID=} crm_task
 * @prop {UUID=} email
 *
 * @param {UUID} user_id
 * @param {UUID[]} step_ids
 * @param {UUID} brand_id
 */
const deleteSteps = async (step_ids, user_id, brand_id) => {
  /** @type {IDeleteReturnType[]} */
  const deleted_steps = await db.select('flow/step/delete', [
    step_ids,
    user_id
  ])

  const events = deleted_steps.filter(/** @type {TIsRequirePropPresent<IDeleteReturnType, 'crm_task'>} */(s => Boolean(s.crm_task))).map(s => s.crm_task)
  const emails = deleted_steps.filter(/** @type {TIsRequirePropPresent<IDeleteReturnType, 'email'>} */(s => Boolean(s.email))).map(s => s.email)

  await CrmTask.remove(events, user_id)

  await EmailCampaign.deleteMany(emails, user_id, brand_id)
}


module.exports = {
  _createEvents,
  _createEmails,
  create,
  delete: deleteSteps,
}
