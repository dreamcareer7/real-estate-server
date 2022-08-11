const nunjucks = require('nunjucks')
const moment = require('moment')
const mjml2html = require('mjml')
const _ = require('lodash')
const ObjectUtil = require('../../ObjectUtil')
const PNF = require('google-libphonenumber').PhoneNumberFormat

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    __dirname
  ])
)

const currencyFilter = price => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

const areaMeterFilter = area_meters => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.floor(area_meters * 10.7639))
}

const phoneNumberFilter = phone => {
  if (!phone)
    return ''

  return ObjectUtil.formatPhoneNumberForDialing(phone, PNF.NATIONAL)
}

const formatDate = (date, kwargs = {}) => {
  const { format = 'dddd, MMMM D, YYYY @ hh:mm A' } = kwargs

  return moment(date).format(format)
}

/**
 * @type {import('../../Brand/settings/types').MarketingPalette}
 */
const default_palette = {
  'body-bg-color': '#f3f3f3',
  'body-text-color': '#7f7f7f',
  'body-font-family': 'Barlow',
  'body-font-weight': 'normal',
  'body-logo-wide': '',
  'body-logo-square': '',
  'body-font-size': '14px',
  'container-bg-color': '#fff',
  'container-text-color': '#000',
  'container-font-family': 'Barlow',
  'container-font-size': '17px',
  'container-font-weight': 'normal',
  'container-logo-wide': '',
  'container-logo-square': '',
  'button-bg-color': 'white',
  'button-text-color': '#000',
  'button-font-family': 'Ubuntu',
  'button-font-size': '14px',
  'button-font-weight': 'normal',
  'button-border': '2px solid #000',
  'light-text-color': '#808080',
  'light-font-family': 'Barlow',
  'light-font-size': '17px',
  'light-font-weight': 'normal',
  'h1-text-color': '#000',
  'h1-font-family': 'Barlow',
  'h1-font-size': '48px',
  'h1-font-weight': 'bold',
  'h2-text-color': '#000',
  'h2-font-family': 'Barlow',
  'h2-font-size': '30px',
  'h2-font-weight': 'bold',
  'h3-text-color': '#000',
  'h3-font-family': 'Barlow',
  'h3-font-size': '23px',
  'h3-font-weight': 'bold',
  'inverted-button-bg-color': '#000',
  'inverted-button-text-color': '#fff',
  'inverted-light-text-color': '#b4b4b4',
  'inverted-h1-text-color': '#fff',
  'inverted-h2-text-color': '#fff',
  'inverted-h3-text-color': '#fff',
  'inverted-logo-wide': '',
  'inverted-logo-square': '',
  'inverted-container-bg-color': '#000',
  'inverted-container-text-color': '#fff',
  website: '',
  phone_number: '',
  name: ''
}

const get = (palette, name) => {
  return palette?.[name] ?? default_palette[name]
}

const getAsset = (brand, name) => {
  return _.get(brand.assets.marketing, name)
}

const getColor = (brand, color) => {
  return _.get(brand.palette.marketing, color)
}
//
const getListingUrl = listing => {
  return ''
}

env.addFilter('currency', currencyFilter)
env.addFilter('area', areaMeterFilter)
env.addFilter('phone', phoneNumberFilter)
env.addFilter('formatdate', formatDate)

const { listing, listings, user, contact, crmopenhouse } = require('./examples')

const available_inputs = {
  listing,
  listings,
  user,
  contact,
  crmopenhouse
}

const render = async ({html, template, brand, palette, variables = {}}) => {
  const { inputs } = template

  const data = {
    get: get.bind(null, palette),
    getColor: getColor.bind(null, brand),
    getAsset: getAsset.bind(null, brand),
    getListingUrl,
  }

  for(const input of inputs)
    data[input] = available_inputs[input]

  Object.assign(data, variables)

  const rendered_palette = template.mjml ? `${__dirname}/palette.mjml` : `${__dirname}/palette.html`
  data.palette = await env.render(rendered_palette, {
    brand,
    ...data
  })

  const source = env.renderString(html, data)

  if (template.mjml)
    return mjml2html(source).html

  return source
}

module.exports = render
