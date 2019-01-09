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

Deal.getContext = (deal, key, default_value = null) => {
  const context = deal.context ? deal.context : {}

  const { text, number, date, data_type } = context[key] || {}

  if (data_type === 'Text')
    return text

  if (data_type === 'Date')
    return new Date(date * 1000)

  if (data_type === 'Number')
    return parseFloat(number)

  return default_value
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
