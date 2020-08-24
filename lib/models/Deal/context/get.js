const db = require('../../../utils/db')

const get = async id => {
  const contexts = await getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Deal Context ${id} not found`)

  return contexts[0]
}

const getAll = async context_ids => {
  const contexts = await db.query.promise('deal/context/get', [context_ids])
  return contexts.rows
}

const getHistory = async (deal_id, context_name) => {
  const res = await db.query.promise('deal/context/history', [
    deal_id,
    context_name
  ])

  const ids = res.rows.map(r => r.id)

  return getAll(ids)
}

const getContext = (deal, key, default_value = null) => {
  const context = deal.context ? deal.context : {}

  const { text, number, date, data_type } = context[key] || {}

  if (data_type === 'Text')
    return text

  if (data_type === 'Date' && date)
    return new Date(date * 1000)

  if (data_type === 'Number')
    return parseFloat(number)

  return default_value
}

const getStreetAddress = deal => {
  const address = [
    getContext(deal, 'street_number'),
    getContext(deal, 'street_dir_prefix'),
    getContext(deal, 'street_name'),
    getContext(deal, 'street_suffix')
  ].join(' ')

  return address
}


module.exports = {
  get,
  getAll,
  getHistory,
  getContext,
  getStreetAddress
}
