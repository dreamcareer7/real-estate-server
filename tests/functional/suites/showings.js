// const agent = require('./mls/agent.js')

// const add = (cb) => {
//   return frisby.create('add an agent')
//     .post('/jobs', {
//       name: 'MLS.Agent',
//       data: {processed: agent}
//     })
//     .after(cb)
//     .expectStatus(200)
// }

// const getById = cb => {
//   return frisby.create('get an agent by id')
//     .get(`/agents/${results.agent.getByMlsId.data.id}`)
//     .after(cb)
//     .expectStatus(200)
//     .expectJSON({
//       code: 'OK',
//       data: results.agent.getByMlsId.data
//     })
// }


function createCredential(cb) {
  const def = {
    name: 'favorite_drinks',
    data_type: 'text',
    label: 'Favorite Drinks',
    section: 'Detials',
    required: false,
    singular: false,
    searchable: false,
    has_label: false,
    enum_values: ['Coffee', 'Tea', 'Iced Tea', 'Juice']
  }

  return frisby
    .create('create a custom attribute')
    .post('/contacts/attribute_defs', def)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: def
    })
}

function getCredential(cb) {
}

function getCredentialByAgent(cb) {
}

function updateCredential(cb) {
}

function deleteCredential(cb) {
  return frisby
    .create('remove the custom attribute')
    .delete(`/contacts/attribute_defs/${results.contact_attribute_def.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  createCredential,
  getCredential,
  getCredentialByAgent,
  updateCredential,
  deleteCredential
}