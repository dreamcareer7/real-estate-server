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
  const contexts = await Deal.get([id])
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

  if (deal_context) {
    if (deal_context.context_type === 'Text')
      return deal_context.text

    if (deal_context.context_type === 'Date')
      return new Date(deal_context.date * 1000)

    if (deal_context.context_type === 'Number')
      return parseFloat(deal_context.number)
  }

  if (mls_context) {
    if (def.type === 'Text')
      return mls_context

    if (def.type === 'Date')
      return new Date(mls_context * 1000)

    if (def.type === 'Number')
      return parseFloat(mls_context)
  }

  return default_value
}

const insertContext = async ({deal, key, value, user, revision, approved}) => {
  const definition = Deal.contexts[key]
  if (!definition)
    throw new Error.Validation(`Context ${key} is not defined`)

  try {
    await db.query.promise('deal/context/insert', [
      deal,
      user,
      definition.type,
      revision,
      Boolean(approved),
      key,
      value,
    ])
  } catch(e) {
    console.log(e)
    throw new Error.Validation(`Cannot save ${key}:${value}`)
  }
}

Deal.saveContext = async ({deal, user, context, revision}) => {
  for (const key in context) {
    expect(context[key]).to.be.an('object')

    const {value, approved} = context[key]
    const c = {
      key,
      value,
      approved,
      deal,
      user,
      revision,
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