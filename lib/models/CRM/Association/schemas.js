const associationSchema = {
  type: 'object',
  oneOf: [
    {
      properties: {
        id: {
          type: 'string',
          uuid: true,
          required: true
        }
      },
      required: ['id']
    },
    {
      properties: {
        deal: {
          type: 'string',
          uuid: true
        },
        assocation_type: {
          type: 'string',
          enum: ['deal']
        }
      },
      required: ['deal']
    },
    {
      properties: {
        contact: {
          type: 'string',
          uuid: true
        },
        assocation_type: {
          type: 'string',
          enum: ['contact']
        }
      },
      required: ['contact']
    },
    {
      properties: {
        listing: {
          type: 'string',
          uuid: true
        },
        assocation_type: {
          type: 'string',
          enum: ['listing']
        }
      },
      required: ['listing']
    }
  ]
}

module.exports = {
  associationSchema
}
