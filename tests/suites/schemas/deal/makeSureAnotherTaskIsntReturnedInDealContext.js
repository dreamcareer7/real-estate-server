module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  required: ['data'],
  type: 'object',
  properties: {
    data: {
      required: ['checklists'],
      properties: {
        checklists: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tasks: {
                type: 'array',
                items: {
                  properties: {
                    deleted_at: {
                      type: 'null'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
