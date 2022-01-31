const _ = require('lodash')
const moment = require('moment')
const numeral = require('numeral')

const render = require('../../../utils/render')
const promisify = require('../../../utils/promisify')

const Deal = {
  ...require('../constants')
}

const BrandContext = {
  ...require('../../Brand/deal/context/get')
}

const DealRole = require('../role/get')

const getAgent = ({deal, roles}) => {
  const role = deal.deal_type === Deal.SELLING ? 'SellerAgent' : 'BuyerAgent'
  return _.find(roles, { role })
}

const TEXT = 'Text'
const DATE = 'Date'
const NUMBER = 'Number'
const CURRENCY = 'Currency'

const types = {}

types[TEXT] = ({context}) => context.text

types[DATE] = ({context, definition}) => {
  if (!context.date)
    return ''

  const format = definition.format ?? 'MMMM DD, YYYY'

  return moment.utc(context.date * 1000).format(format)
}

types[NUMBER] = ({context, definition}) => {
  if (context.number !== false && definition.format === CURRENCY)
    return numeral(context.number).format('0,0.00')

  return context.number.toString()
}

const zipSummary = async ({deal}) => {
  const roles = await DealRole.getAll(deal.roles)

  const agent = getAgent({deal, roles})
  const definition_ids = Object.values(deal.context).map(context => context.definition)
  const definitions = _.keyBy(await BrandContext.getAll(definition_ids), 'id')

  const toText = pair => {
    pair.text = types[pair.context.data_type](pair)
  }

  const contexts = _
    .chain(deal.context)
    .map(context => {
      return {
        context,
        definition: definitions[context.definition]
      }
    })
    .filter(({definition}) => Boolean(definition.exports))
    .orderBy('context.definition.label')
    .forEach(toText)
    .value()

  const html = await promisify(render.html)(`${__dirname}/index.html`, {deal, agent, contexts, roles})
  require('fs').writeFileSync('/tmp/1.html', html)
}

module.exports = zipSummary
