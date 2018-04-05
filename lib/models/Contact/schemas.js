const contact_attribute = {
  type: 'object',
  properties: {
    text: {
      type: ['string', 'null']
    },
    date: {
      type: ['number', 'null']
    },
    number: {
      type: ['number', 'null']
    },
    label: {
      type: ['string', 'null']
    },
    is_primary: {
      type: 'boolean'
    },
    attribute_def: {
      type: 'string',
      uuid: true,
      required: true
    },
    contact: {
      type: 'string',
      uuid: true,
      required: true
    },
  }
}

const contact = {
  type: 'object',
  properties: {
    attributes: {
      type: 'array',
    },
    ios_address_book_id: {
      type: 'string'
    },
    android_address_book_id: {
      type: 'string'
    }
  }
}

module.exports = {
  contact,
  contact_attribute
}
