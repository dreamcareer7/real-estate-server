const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const Context = require('../../Context')
const CrmTask = require('../../CRM/Task')
const EmailCampaign = require('../../Email/campaign/delete')


/**
 * @param {import('./types').IFlowStepInput[]} steps 
 */
const create = async (steps) => {
  Context.log(`Creating ${steps.length} steps`)

  const q = sq.insert({ autoQuoteFieldNames: true })
    .into('flows_steps')
    .setFieldsRows(steps)
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
  create,
  delete: deleteSteps,
}
