module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  required: ['data'],
  type: 'object',
  properties: {
    data: {
      required: ['roles'],
      properties: {
        deal_context: {
          required: ['full_address']
        },
        roles: {
          type: 'array',
          minItems: 3,
          items: {
            type: 'object'
          }
        }
      }
    }
  }
}
