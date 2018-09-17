const template = require('./data/template.js')

registerSuite('brand', ['createParent'])

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
    .get('/templates?types[]=Listing')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [template]
    })
}

module.exports = {
  create,
  getForUser
}
