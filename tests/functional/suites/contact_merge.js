const _ = require('lodash')

registerSuite('contact', [
  'brandCreateParent',
  'brandCreate',
  'getAttributeDefs',
  'create',
  'createCompanyContact',
  'importManyContacts',
  'getContacts'
])

function is_primary_address_field(a) {
  return (
    [
      'state',
      'postal_code',
      'street_number',
      'street_prefix',
      'street_suffix',
      'unit_number',
      'street_name',
      'city',
      'country'
    ].includes(a.attribute_type) && Boolean(a.is_primary)
  )
}

const secondMCHasPrimaryAddress = cb => {
  const contact_id = results.contact.getContacts.data[2].id

  return frisby
    .create('second MC has a primary address')
    .get(`/contacts/${contact_id}?associations[]=contact.attributes`)
    .after((err, res, json) => {
      let last = []
      if (
        !json.data.attributes.every(a => {
          last = [a.attribute_type, a.index]
          return (
            ![
              'state',
              'postal_code',
              'street_number',
              'street_prefix',
              'street_suffix',
              'unit_number',
              'street_name',
              'city',
              'country'
            ].includes(a.attribute_type) || Boolean(a.is_primary)
          )
        })
      ) {
        throw 'is_primary is false for ' + last[0] + ' attribute #' + last[1]
      }
      cb(err, res, json)
    })
}

const subcontactAddressIsPrimaryIsIgnored = cb => {
  const sub_contacts = results.contact.getContacts.data.slice(2, 4).map(c => c.id)
  const parent_id = results.contact.getContacts.data[4].id

  return frisby
    .create('primary status of address fields in subcontacts is ignored')
    .post(`/contacts/${parent_id}/merge?associations[]=contact.attributes`, {
      sub_contacts
    })
    .after((err, res, json) => {
      let last = []
      if (
        !Object.values(
          _.groupBy(json.data.attributes, 'index')
        ).some(g =>
          g.every(a => {
            last = [a.attribute_type, a.index, a.is_primary]
            return is_primary_address_field(a)
          })
        )
      ) {
        throw `is_primary is ${last[2]} for ${last[0]} attribute #${last[1]}`
      }
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        id: parent_id
      }
    })
}

module.exports = {
  secondMCHasPrimaryAddress,
  subcontactAddressIsPrimaryIsIgnored
}
