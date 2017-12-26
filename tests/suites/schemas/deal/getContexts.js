module.exports = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  required: ['data'],
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        required: ['name', 'type'],
        properties: {
          property_type: {
            type: 'array',
            minItems: 1
          }
        }
      }
    }
  }
}