const fs = require('fs')
const path = require('path')
const template = require('./data/template.js')

registerSuite('brand', ['createParent'])
registerSuite('deal', ['create', 'addChecklist', 'addContext', 'approveContext', 'patchListing'])

const create = cb => {
  template.brand = results.brand.createParent.data.id

  return frisby.create('create a template')
    .post('/templates', template)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: template
    })
}

const getForUser = cb => {
  return frisby.create('get templates for a user')
    .get('/templates?types[]=JustListed&mediums[]=Email')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [template]
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

module.exports = {
  create,
  getForUser,
  instantiate,
  share,
  getMine,
  createAsset,
  deleteInstance
}
