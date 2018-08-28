registerSuite('contact', ['brandCreateParent', 'brandCreate', 'getAttributeDefs', 'create'])

function create(cb) {
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

function useInContact(cb) {
  const attr = {
    attribute_def: results.contact_attribute_def.create.data.id,
    text: 'Coffee'
  }

  return frisby
    .create('use the custom attribute in a contact')
    .post(`/contacts/${results.contact.create.data[0].id}/attributes?associations[]=contact.sub_contacts&associations[]=contact_attribute.attribute_def`, {
      attributes: [attr]
    })
    .after((err, res, json) => {
      if (!json.data.sub_contacts[0].attributes.find(a => a.attribute_def.id === attr.attribute_def))
        throw `Custom attribute ${attr.attribute_def} didn't show up on contact data.`
      cb(err, res, json)
    })
    .expectStatus(200)
}

function remove(cb) {
  return frisby
    .create('remove the custom attribute')
    .delete(`/contacts/attribute_defs/${results.contact_attribute_def.create.data.id}`)
    .after(cb)
    .expectStatus(204)
}

function checkRemovedCustomAttribute(cb) {
  const def_id = results.contact_attribute_def.create.data.id

  return frisby
    .create('make sure contact attributes with the deleted attribute_def are also deleted')
    .get(`/contacts/${results.contact.create.data[0].id}?associations[]=contact.sub_contacts&associations[]=contact_attribute.attribute_def`)
    .after((err, res, json) => {
      if (json.data.sub_contacts[0].attributes.find(a => a.attribute_def.id === def_id))
        throw `Deleted custom attribute ${def_id} still shows up on contact data.`
      cb(err, res, json)
    })
    .expectStatus(200)
}

module.exports = {
  create,
  useInContact,
  remove,
  checkRemovedCustomAttribute
}