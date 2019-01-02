const { expect } = require('../../../utils/validator')
const db = require('../../../utils/db')

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

const mls_types = {
  mls_number: 'Number',
  list_price: 'Number',
  list_date: 'Date',
  year_built: 'Number',
  postal_code: 'Text',
}

Deal.getContext = (deal, key, default_value = null) => {
  const mls_context = deal.mls_context ? deal.mls_context[key] : undefined
  const deal_context = deal.deal_context ? deal.deal_context[key] : undefined

  let deal_value = null
  let def = null

  if (deal_context) {
    def = deal_context.definition

    if (deal_context.context_type === 'Text')
      deal_value = deal_context.text

    if (deal_context.context_type === 'Date')
      deal_value = new Date(deal_context.date * 1000)

    if (deal_context.context_type === 'Number')
      deal_value = parseFloat(deal_context.number)
  }

  let mls_value = null

  if (mls_context) {
    if (mls_types[key] === 'Date')
      mls_value = new Date(mls_context * 1000)

    if (mls_types[key] === 'Number')
      mls_value = parseFloat(mls_context)

    mls_value = mls_context
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
  if (def.preffered_source === 'MLS')
    return mls_value

  return deal_value
}

const insertContext = async ({deal, definition, value, user, approved, checklist}) => {
  expect(checklist).to.be.uuid

  try {
    await db.query.promise('deal/context/insert', [
      definition,
      deal,
      user,
      checklist,
      Boolean(approved),
      value
    ])

  } catch(e) {
    Context.log(e)
    throw new Error.Validation(`Cannot save ${definition}:${value}`)
  }
}

Deal.saveContext = async ({deal, user, context}) => {
  for (const item of context) {
    expect(item).to.be.an('object')

    const { value, approved, checklist, definition } = item
    const c = {
      definition,
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
