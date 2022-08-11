const _ = require('lodash')
const moment = require('moment')
const numeral = require('numeral')
const Color = require('color')

const render = require('../../../utils/render')
const promisify = require('../../../utils/promisify')

const AttachedFile = require('../../AttachedFile')

const Deal = require('../constants')
const DealContext = require('../context/get')

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

const renderPdf = require('../../Template/render')

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

const getAttribute = (key, settings, _default) => {
  for(const { marketing_palette } of settings)
    if (_.get(marketing_palette, key))
      return _.get(marketing_palette, key)

  return _default


}

const getPalette = async deal => {
  const parents = await Brand.getParents(deal.brand)
  const settings = await BrandSettings.getByBrands(parents)

  const bg = Color(getAttribute('inverted-container-bg-color', settings, '#000')).rgb().array()
  const text = Color(getAttribute('inverted-container-text-color', settings, '#00b286')).rgb().array()
  const wide_logo = getAttribute('container-logo-wide', settings)
  const square_logo = getAttribute('container-logo-square', settings, 'https://assets.rechat.com/daily/logo.png')

  const palette = {
    'inverted-container-bg-color': bg,
    'inverted-container-text-color': text,
    'container-logo-wide': wide_logo,
    'container-logo-square': square_logo
  }

  return palette
}

const getSide = deal => {
  const ender_type = DealContext.getContext(deal, 'ender_type')
  let ender = ''
  switch (ender_type) {
    case Deal.AGENT_DOUBLE_ENDER:
      ender = ' (Agent Double Ender)'
      break

    case Deal.OFFICE_DOUBLE_ENDER:
      ender = ' (Office Double Ender)'
      break

    default:
      break
  }

  const text = (deal.deal_type === Deal.BUYING ? 'Buying' : 'Selling') + ender

  return {
    context: {
      text,
      data_type: TEXT
    },
    definition: {
      label: 'Side'
    }
  }
}

const generate = async ({deal}) => {
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
    .concat([getSide(deal)])
    .orderBy(['definition.label', 'asc'])
    .filter(pair => !['street_address', 'full_address'].includes(pair.definition.key)) // We already show address on top
    .forEach(toText)
    .value()

  const palette = await getPalette(deal)

  return await promisify(render.html)(`${__dirname}/index.html`, {deal, agent, contexts, roles, palette, all_roles})
}

const zipSummary = async ({deal, zip}) => {
  const filename = 'Summary.pdf'
  const type = 'PDF'

  const path = `deals/${deal.id}`

  const { presigned, file } = await AttachedFile.preSave({
    path,
    filename,
    public: false
  })

  const html = await generate({deal})

  await renderPdf({
    template: {},
    html,
    presigned,
    type,
    expires: (Date.now() + (86400 * 10)) / 1000 // Expires in a day. A few minutes should be enough. This will be immediately downloaded back into a zip file
  })

  const stream = await AttachedFile.downloadAsStream(file)

  const name = 'Summary.pdf'

  zip.file(name, stream, { binary: true })
}

module.exports = zipSummary
