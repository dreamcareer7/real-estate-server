const parser = require('parse-address')

const map = ({object}) => {
  const attributes = []

  if (object.email)
    attributes.push({
      attribute_type: 'email',
      text: object.email
    })

  if (object.phone)
    attributes.push({attribute_type: 'phone_number',
      text: object.phone,
      label: 'Phone',
    })

  if (object.mobilePhone)
    attributes.push({attribute_type: 'phone_number',
      text: object.mobilePhone,
      label: 'Cell Phone',
    })

  if (object.workPhone)
    attributes.push({
      attribute_type: 'phone_number',
      text: object.workPhone,
      label: 'Work Phone',
    })

  if (object.firstName)
    attributes.push({
      attribute_type: 'first_name',
      text: object.firstName
    })

  if (object.lastName)
    attributes.push({
      attribute_type: 'last_name',
      text: object.lastName
    })

  if (object.title)
    attributes.push({
      attribute_type: 'title',
      text: object.title
    })

  if (object.birthday)
    attributes.push({
      attribute_type: 'birthday',
      date: new Date(object.birthday)
    })

  if (object.anniversary)
    attributes.push({
      attribute_type: 'wedding_anniversary',
      date: new Date(object.anniversary)
    })

  if (object.zip)
    attributes.push({
      attribute_type: 'postal_code',
      text: object.zip,
      index: 0
    })

  if (object.city)
    attributes.push({
      attribute_type: 'city',
      text: object.city,
      index: 0
    })

  if (object.state)
    attributes.push({
      attribute_type: 'state',
      text: object.state,
      index: 0
    })

  if (object.notes)
    attributes.push({
      attribute_type: 'notes',
      text: object.notes
    })

  try {
    if (object.address1) {
      const parsed1 = parser.parseLocation(object.address1)

      if (parsed1.number)
        attributes.push({
          attribute_type: 'street_number',
          text: parsed1.number,
          index: 0
        })

      if (parsed1.street)
        attributes.push({
          attribute_type: 'street_name',
          text: parsed1.street,
          index: 0
        })

      if (parsed1.prefix)
        attributes.push({
          attribute_type: 'street_prefix',
          text: parsed1.prefix,
          index: 0
        })

      if (parsed1.type)
        attributes.push({
          attribute_type: 'street_suffix',
          text: parsed1.type,
          index: 0
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
          index: 1
        })

      if (parsed2.street)
        attributes.push({
          attribute_type: 'street_name',
          text: parsed2.street,
          index: 1
        })

      if (parsed2.prefix)
        attributes.push({
          attribute_type: 'street_prefix',
          text: parsed2.prefix,
          index: 1
        })

      if (parsed2.type)
        attributes.push({
          attribute_type: 'street_suffix',
          text: parsed2.type,
          index: 1
        })
    }
  } catch(e) {
    Context.log('Cannot parse', object.address2)
  }

  return { attributes }
}

module.exports = map
