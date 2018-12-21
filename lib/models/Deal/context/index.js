const { expect } = require('../../../utils/validator')
const db = require('../../../utils/db')

require('./all.js')

DealContext = {}

Orm.register('deal_context_item', 'DealContext')

DealContext.associations = {
  created_by: {
    enabled: false,
    optional: true,
    model: 'User'
  },

  approved_by: {
    enabled: false,
    optional: true,
    model: 'User'
  },

  submission: {
    enabled: false,
    optional: true,
    model: 'Submission'
  }
}

DealContext.get = async id => {
  const contexts = await DealContext.getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Deal Context ${id} not found`)

  return contexts[0]
}

DealContext.getAll = async context_ids => {
  const contexts = await db.query.promise('deal/context/get', [context_ids])
  return contexts.rows
}

DealContext.getHistory = async (deal_id, context_name) => {
  const res = await db.query.promise('deal/context/history', [
    deal_id,
    context_name
  ])

  const ids = res.rows.map(r => r.id)

  return DealContext.getAll(ids)
}

Deal.getContext = (deal, key, default_value = null) => {
  const def = Deal.contexts[key]

  const mls_context = deal.mls_context ? deal.mls_context[key] : undefined
  const deal_context = deal.deal_context ? deal.deal_context[key] : undefined

  let deal_value = null

  if (deal_context) {
    if (deal_context.context_type === 'Text')
      deal_value = deal_context.text

    if (deal_context.context_type === 'Date')
      deal_value = new Date(deal_context.date * 1000)

    if (deal_context.context_type === 'Number')
      deal_value = parseFloat(deal_context.number)
  }

  let mls_value = null

  if (mls_context) {
    if (def.type === 'Text')
      mls_value = mls_context

    if (def.type === 'Date')
      mls_value = new Date(mls_context * 1000)

    if (def.type === 'Number')
      mls_value = parseFloat(mls_context)
  }

  // We only have deal_value. Return it.
  if (deal_value && !mls_value)
    return deal_value

  // We only have mls_value. Return it.
  if (!deal_value && mls_value)
    return mls_value

  // We have neither. Return default value.
  if (!deal_value && !mls_value)
    return default_value

  // We have both. Return the one preferred by caller.
  if (def.priority === 'MLS')
    return mls_value

  return deal_value
}

const insertContext = async ({deal, key, value, user, approved, checklist}) => {
  const definition = Deal.contexts[key]
  if (!definition)
    throw new Error.Validation(`Context ${key} is not defined`)

  expect(checklist).to.be.uuid

  try {
    await db.query.promise('deal/context/insert', [
      deal,
      user,
      definition.type,
      checklist,
      Boolean(approved),
      key,
      value
    ])

  } catch(e) {
    console.log(e)
    throw new Error.Validation(`Cannot save ${key}:${value}`)
  }
}

Deal.saveContext = async ({deal, user, context}) => {
  for (const key in context) {
    expect(context[key]).to.be.an('object')

    const { value, approved, checklist } = context[key]
    const c = {
      key,
      value,
      approved,
      deal,
      user,
      checklist
    }

    await insertContext(c)
  }
}

Deal.setContextApproval = ({context, approved, user}, cb) => {
  db.query('deal/context/set_approved', [
    context,
    approved,
    user
  ], cb)
}
