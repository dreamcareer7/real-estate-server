const fs = require('fs')
const path = require('path')
const template = require('./data/template.js')

registerSuite('brand', ['createParent'])
registerSuite('deal', ['create', 'addChecklist', 'addContext', 'approveContext', 'patchListing'])

const create = cb => {
  return frisby.create('create a template')
    .post('/templates', {
      ...template,
      html: 'HTML {{ user.first_name }} {{ listing.property.address.state }}',
      brands: [
        results.brand.createParent.data.id
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: template
    })
}

const getForBrand = cb => {
  return frisby.create('get templates for a user')
    .get(`/brands/${results.brand.createParent.data.id}/templates?types[]=JustListed&mediums[]=Email`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{template}]
    })
}

const getCategoriesForBrand = cb => {
  return frisby.create('get categories for a user')
    .get(`/brands/${results.brand.createParent.data.id}/templates/categories?mediums[]=Email&filter=template`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        JustListed: [
          'Email'
        ]
      }
    })
}

const instantiate = cb => {
  const id = results.template.create.data.id
  const html = 'SOME HTML'

  const data = {
    html,
    deals: [
      results.deal.patchListing.data.id
    ],
    listings: [
      results.deal.patchListing.data.listing
    ],
    contacts: []
  }

  return frisby.create('create an instance of a template')
    .post(`/templates/${id}/instances`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        html
      }
    })
}

const _sms = {
  MediaContentType0: 'image/gif',
  SmsMessageSid: 'MM120f640a61ea4b4f0d7bffbb04554084',
  NumMedia: '1',
  Body: 'Prescott Avenue',
  From: '+14243828604',
  To: '+12148806266',
  MediaUrl0: 'https://upload.wikimedia.org/wikipedia/en/4/48/Blank.JPG',
}

const sms = cb => {
  return frisby.create('text marketing')
    .post('/templates/sms', _sms, {json: false})
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
    .expectStatus(200)
}

const renderTemplate = cb => {
  const id = results.template.create.data.id

  const variables = {
    'user.first_name': 'FIRST_NAME',
    'listing.property.address.state': 'STATE'
  }

  const data = {
    variables
  }

  const expected = 'HTML FIRST_NAME STATE'

  return frisby.create('create an instance of a template')
    .post(`/templates/${id}/render`, data)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectBodyContains(expected)
}

const share = cb => {
  const text = 'Please share this'

  const data = {
    text,
    recipients: [
      '+14243828604'
    ]
  }

  const id = results.template.instantiate.data.id

  return frisby.create('share an instance')
    .post(`/templates/instances/${id}/share`, data)
    .after(cb)
    .expectStatus(200)
    .expectJSON(results.template.instantiate)
}

const getMine = cb => {
  return frisby.create('get my marketing instances')
    .get('/templates/instances')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [ results.template.instantiate.data ]
    })
}

function createAsset(cb) {
  const logo = fs.createReadStream(path.resolve(__dirname, 'data/logo.png'))

  return frisby
    .create('create an asset')
    .post(
      '/templates/assets',
      {
        file: logo,
        template: results.template.create.data.id,
        listing: results.deal.patchListing.data.listing
      },
      {
        json: false,
        form: true
      }
    )
    .addHeader('content-type', 'multipart/form-data')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

const deleteInstance = cb => {
  return frisby.create('delete an instance')
    .delete(`/templates/instances/${results.template.instantiate.data.id}`)
    .after(cb)
    .expectStatus(204)
}

const updateThumbnails = (cb) => {
  return frisby.create('Update Thumbnails')
    .post('/jobs', {
      name: 'BrandTemplate.updateThumbnails'
    })
    .after(cb)
    .expectStatus(200)
}

const deleteTemplate = cb => {
  return frisby.create('delete a template (from brand)')
    .delete(`/brands/${results.brand.createParent.data.id}/templates/${results.template.getForBrand.data[0].id}`)
    .after(cb)
    .expectStatus(204)
}

const invalidateThumbnails = cb => {
  return frisby.create('invalidate thumbnails for a brand')
    .post(`/brands/${results.brand.createParent.data.id}/templates/thumbnails/invalidate`)
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  create,
  getForBrand,
  getCategoriesForBrand,
  instantiate,
  sms,
  renderTemplate,
  share,
  getMine,
  createAsset,
  deleteInstance,
  updateThumbnails,
  invalidateThumbnails,
  deleteTemplate,
}
