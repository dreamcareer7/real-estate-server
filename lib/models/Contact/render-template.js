const { strict: assert } = require('assert')
const { promisify } = require('util')
const render = require('../Template/thumbnail/render')
const AttachedFile = require('../AttachedFile')
const Template = require('../Template/get')
const User = require('../User/get')
const Brand = {
  ...require('../Brand/get'),
  ...require('../Brand/constants'),
}
const Contact = require('./get')

/**
 * @param {object} options
 * @param {UUID} options.templateId
 * @param {UUID[]} options.contactIds
 * @param {UUID} options.brandId
 * @param {UUID} options.userId
 * @returns {Promise<string[]>}
 */
async function renderTemplate ({ templateId, contactIds, brandId, userId }) {
  if (!contactIds.length) { return [] }
  
  const template = await Template.get(templateId)
  const user = await User.get(userId)

  const parents = await Brand.getParents(brandId).then(Brand.getAll)
  const brokerageBrand = parents.find(p => p.brand_type === Brand.BROKERAGE)
  assert(brokerageBrand, `brokerage brand not found for brand ${brandId}`)

  const download = promisify(/** @type {any} */(AttachedFile).download)
  const html = (await download(template.file)).toString()

  const renderUsing = (/** @type {any} */ variables) => render({
    html,
    template,
    brand: brokerageBrand,
    variables,
    palette: undefined,
  })

  if (!template.inputs.includes('contact')) {
    const rendered = await renderUsing({ user })
    return contactIds.map(() => rendered)
  }

  const results = []
  for (const contact of await Contact.getAll(contactIds)) {
    results.push(await renderUsing({ user, contact }))
  }

  return results
}

module.exports = { renderTemplate }
