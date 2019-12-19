const nunjucks = require('nunjucks')
const moment = require('moment')
const mjml2html = require('mjml')
const env = new nunjucks.configure()
const _ = require('lodash')

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

  return ObjectUtil.formatPhoneNumberForDialing(phone, 'National')
}

const formatDate = (date, kwargs = {}) => {
  const { format = 'dddd, MMMM D, YYYY @ hh:mm A' } = kwargs

  return moment(date).format(format)
}

const getAsset = (brand, name) => {
  return _.get(brand.assets.marketing, name)
}

const getColor = (brand, color) => {
  return _.get(brand.palette.marketing, color)
}

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

const render = async ({html, template, brand}) => {
  const { inputs } = template

  const data = {
    getAsset: getAsset.bind(null, brand),
    getColor: getColor.bind(null, brand),
    getListingUrl
  }

  for(const input of inputs)
    data[input] = available_inputs[input]

  data.palette = await env.render(`${__dirname}/palette.html`, {
    brand
  })

  const source = env.renderString(html, data)

  if (template.mjml)
    return mjml2html(source).html

  return source
}

module.exports = render
