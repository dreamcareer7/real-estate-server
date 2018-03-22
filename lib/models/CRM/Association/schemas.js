const dealAssociationSchema = {
  properties: {
    deal: {
      type: 'string',
      uuid: true
    }
  },
  required: ['deal']
}

const contactAssociationSchema = {
  properties: {
    contact: {
      type: 'string',
      uuid: true
    }
  },
  required: ['contact']
}

const listingAssociationSchema = {
  properties: {
    listing: {
      type: 'string',
      uuid: true
    }
  },
  required: ['listing']
}

const associationSchema = {
  type: 'object',
  properties: {
    assocation_type: {
      type: 'string',
      enum: [
        'contact',
        'deal',
        'listing'
      ]
    }
  },
  oneOf: [
    dealAssociationSchema,
    contactAssociationSchema,
    listingAssociationSchema
  ]
}

module.exports = {
  associationSchema,
}
