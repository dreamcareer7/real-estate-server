const H = require('../jsonSchemaHelper')

const schema = H.schema({
  checklists: H.Required(H.Array({
    items: H.Object({
      tasks: H.Array({
        items: H.Object({
          deleted_at: H.Null
        })
      })
    })
  }))
})

module.exports = schema
