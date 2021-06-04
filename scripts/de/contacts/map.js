const parser = require('parse-address')

const Context = require('../../../lib/models/Context')

const { find } = require('lodash')

const map = ({object}, attrs) => {
  const attributes = []

  const isNew = !attrs

  isNew && attributes.push({
    attribute_type: 'source',
    text: 'Imported From Studio'
  })

  if (object.email)
    attributes.push({
      attribute_type: 'email',
      text: object.email,
      id: find(attrs, { attribute_type: 'email', text: object.email })?.id
    })

  if (object.phone)
    attributes.push({
      attribute_type: 'phone_number',
      text: object.phone,
      label: 'Phone',
      id: find(attrs, { attribute_type: 'phone', label: 'Phone', text: object.phone })?.id
    })

  if (object.mobilePhone)
    attributes.push({
      attribute_type: 'phone_number',
      text: object.mobilePhone,
      label: 'Cell Phone',
      id: find(attrs, { attribute_type: 'phone', label: 'Cell Phone', text: object.mobilePhone })?.id
    })

  if (object.workPhone)
    attributes.push({
      attribute_type: 'phone_number',
      text: object.workPhone,
      label: 'Work Phone',
      id: find(attrs, { attribute_type: 'phone', label: 'Work Phone', text: object.workPhone })?.id
    })

  if (object.firstName)
    attributes.push({
      attribute_type: 'first_name',
      text: object.firstName,
      id: find(attrs, { attribute_type: 'first_name' })?.id
    })

  if (object.lastName)
    attributes.push({
      attribute_type: 'last_name',
      text: object.lastName,
      id: find(attrs, { attribute_type: 'last_name' })?.id
    })

  if (object.title)
    attributes.push({
      attribute_type: 'title',
      text: object.title,
      id: find(attrs, { attribute_type: 'title' })?.id
    })

  if (object.birthday)
    attributes.push({
      attribute_type: 'birthday',
      date: (new Date(object.birthday)).getTime(),
      id: find(attrs, { attribute_type: 'birthday' })?.id
    })

  if (object.anniversary)
    attributes.push({
      attribute_type: 'wedding_anniversary',
      date: (new Date(object.anniversary)).getTime(),
      id: find(attrs, { attribute_type: 'wedding_anniversary' })?.id
    })

  if (object.zip)
    attributes.push({
      attribute_type: 'postal_code',
      text: object.zip,
      index: 0,
      id: find(attrs, { attribute_type: 'postal_code', index: 0 })?.id
    })

  if (object.city)
    attributes.push({
      attribute_type: 'city',
      text: object.city,
      index: 0,
      id: find(attrs, { attribute_type: 'city', index: 0 })?.id
    })

  if (object.state)
    attributes.push({
      attribute_type: 'state',
      text: object.state,
      index: 0,
      id: find(attrs, { attribute_type: 'state', index: 0 })?.id
    })


  if (object.notes) {
    const found = find(attrs, { attribute_type: 'note', text: object.notes })

    !found && attributes.push({
      attribute_type: 'note',
      text: object.notes,
    })
  }

  try {
    if (object.address1) {
      const parsed1 = parser.parseLocation(object.address1)

      if (parsed1.number)
        attributes.push({
          attribute_type: 'street_number',
          text: parsed1.number,
          index: 0,
          id: find(attrs, { attribute_type: 'street_number', index: 0 })?.id
        })

      if (parsed1.street)
        attributes.push({
          attribute_type: 'street_name',
          text: parsed1.street,
          index: 0,
          id: find(attrs, { attribute_type: 'street_name', index: 0 })?.id
        })

      if (parsed1.prefix)
        attributes.push({
          attribute_type: 'street_prefix',
          text: parsed1.prefix,
          index: 0,
          id: find(attrs, { attribute_type: 'street_prefix', index: 0 })?.id
        })

      if (parsed1.type)
        attributes.push({
          attribute_type: 'street_suffix',
          text: parsed1.type,
          index: 0,
          id: find(attrs, { attribute_type: 'street_suffix', index: 0 })?.id
        })
    }
  } catch(e) {
    Context.log('Cannot parse', object.address1)
  }

  try {
    if (object.address2) {
      const parsed2 = parser.parseLocation(object.address2)

      if (parsed2.number)
        attributes.push({
          attribute_type: 'street_number',
          text: parsed2.number,
          index: 1,
          id: find(attrs, { attribute_type: 'street_number', index: 1 })?.id
        })

      if (parsed2.street)
        attributes.push({
          attribute_type: 'street_name',
          text: parsed2.street,
          index: 1,
          id: find(attrs, { attribute_type: 'street_name', index: 1 })?.id
        })

      if (parsed2.prefix)
        attributes.push({
          attribute_type: 'street_prefix',
          text: parsed2.prefix,
          index: 1,
          id: find(attrs, { attribute_type: 'street_prefix', index: 1 })?.id
        })

      if (parsed2.type)
        attributes.push({
          attribute_type: 'street_suffix',
          text: parsed2.type,
          index: 1,
          id: find(attrs, { attribute_type: 'street_suffix', index: 1 })?.id
        })
    }
  } catch(e) {
    Context.log('Cannot parse', object.address2)
  }

  return { attributes }
}

module.exports = map
