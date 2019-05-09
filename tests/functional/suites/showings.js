
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