const _ = require('lodash')

registerSuite('contact', [
  'brandCreateParent',
  'brandCreate',
  'getAttributeDefs',
  'create',
  'createManyContacts'
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
  const contact_id = results.contact.createManyContacts.data[0]

  return frisby
    .create('second MC has a primary address')
    .get(`/contacts/${contact_id}?associations[]=contact.sub_contacts`)
    .after((err, res, json) => {
      let last = []
      if (
        !json.data.sub_contacts[0].attributes.every(a => {
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
  const sub_contacts = _.take(results.contact.createManyContacts.data, 2)
  const parent_id = results.contact.createManyContacts.data[2]

  return frisby
    .create('primary status of address fields in subcontacts is ignored')
    .post(`/contacts/${parent_id}/merge?associations[]=contact.sub_contacts`, {
      sub_contacts
    })
    .after((err, res, json) => {
      let last = []
      if (
        !Object.values(
          _.groupBy(json.data.sub_contacts[0].attributes, 'index')
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
