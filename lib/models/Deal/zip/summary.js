const _ = require('lodash')
const moment = require('moment')
const numeral = require('numeral')
const parseColor = require('parse-css-color')

const render = require('../../../utils/render')
const promisify = require('../../../utils/promisify')

const Deal = {
  ...require('../constants')
}

const Brand = require('../../Brand/get')
const BrandSettings = require('../../Brand/settings/get')

const BrandContext = {
  ...require('../../Brand/deal/context/get')
}

const all_roles = require('../../Brand/deal/property_type/roles')

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

const getPalette = async deal => {
  const parents = await Brand.getParents(deal.brand)
  const settings = await BrandSettings.getByBrands(parents)

  for(const { marketing_palette } of settings)
    if (marketing_palette)
      return {
        'inverted-container-bg-color': parseColor(marketing_palette['inverted-container-bg-color']).values,
        'container-logo-wide': marketing_palette['container-logo-wide'],
        'container-logo-square': marketing_palette['container-logo-square'],
      }

  return {
    'inverted-container-bg-color': '#00B286',
    'container-logo-square': 'https://assets.rechat.com/daily/logo.png'
  }
}

const zipSummary = async ({deal}) => {
  const _roles = _.orderBy(await DealRole.getAll(deal.roles), ['role', 'asc'], ['legal_full_name', 'asc'])

  /* In the UI we need to show a number of top of each role (if there's more than 1 of that role).
   * Calculating that number is almost impossible in nunjucks.
   * Grouped, first groups rolei id's by their role
   * And then we iterate them and assign the role.num using the grouped variable
   */
  const grouped = _.chain(_roles)
    .groupBy('role')
    .mapValues(group => {
      return group.map(role => role.id)
    })
    .value()

  const roles = _.chain(_roles)
    .orderBy('title')
    .forEach(role => {
      if (grouped[role.role].length > 1)
        role.num = grouped[role.role].indexOf(role.id) + 1
    })
    .value()

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
    .orderBy(['definition.label', 'asc'])
    .filter(pair => !['street_address', 'full_address'].includes(pair.definition.key)) // We already show address on top
    .forEach(toText)
    .value()

  const palette = await getPalette(deal)

  const html = await promisify(render.html)(`${__dirname}/index.html`, {deal, agent, contexts, roles, palette, all_roles})
  require('fs').writeFileSync('/tmp/1.html', html)
}

module.exports = zipSummary
