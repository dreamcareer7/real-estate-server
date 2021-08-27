const request = require('request-promise-native')
const { strict: assert } = require('assert')
const { promisify } = require('util')
const config = require('../../config')
const renderTemplate = require('../Template/thumbnail/render')
const AttachedFile = require('../AttachedFile')
const Template = require('./get')
const User = require('../User/get')
const Brand = {
  ...require('../Brand/get'),
  ...require('../Brand/constants'),
}



if ( process.env.NODE_ENV === 'tests' )
  require('./mock')

const SCREENSHOTS = '/screenshot'
const SCREENCASTS = '/screencast'

const render = async ({template, html, presigned, width, height, type}) => {
  const endpoint = template.video ? SCREENCASTS : SCREENSHOTS
  const url = `${config.screenshots.host}${endpoint}`

  return request.post({
    url,
    json: {
      html,
      presigned,
      width,
      height,
      type
    }
  })
}

/**
 * @param {object} options
 * @param {UUID} options.templateId
 * @param {IContact[]} options.contacts
 * @param {UUID} options.brandId
 * @param {UUID} options.userId
 * @returns {Promise<string[]>}
 */
async function renderForContacts ({ templateId, contacts, brandId, userId }) {
  if (!contacts.length) { return [] }
  
  const template = await Template.get(templateId)
  const user = await User.get(userId)

  const parents = await Brand.getParents(brandId).then(Brand.getAll)
  const brokerageBrand = parents.find(p => p.brand_type === Brand.BROKERAGE)
  assert(brokerageBrand, `brokerage brand not found for brand ${brandId}`)

  const download = promisify(/** @type {any} */(AttachedFile).download)
  const html = (await download(template.file)).toString()

  const render = (/** @type {any} */ variables) => renderTemplate({
    html,
    template,
    brand: brokerageBrand,
    variables,
    palette: undefined,
  })

  if (!template.inputs.includes('contact')) {
    const rendered = await render({ user })
    return contacts.map(() => rendered)
  }

  return Promise.all(contacts.map(c => render({ user, contact: c })))
}

module.exports = Object.assign(render, {
  renderForContacts,
})
