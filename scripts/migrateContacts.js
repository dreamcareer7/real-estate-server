const _ = require('lodash')

function migrateContacts(contacts) {
  for (const contact of contacts) {
    contact.attributes = _.flatMap(contact.attributes, (attrs, type) => {
      if (type === 'names' || type === 'addresses') {
        return _.flatMap(attrs, attr => {
          return Object.keys(attr)
            .filter(k => k !== 'type')
            .map(field => ({
              type: field,
              text: attr[field],
              label: attr.label,
              is_primary: attr.is_primary
            }))
            .map(attr => {
              return _.pick(
                attr,
                Object.keys(attr).filter(k => attr[k] !== undefined)
              )
            })
        })
      }

      return attrs.map(attr => {
        if (typeof attr[attr.type] === 'number') attr.date = attr[attr.type]
        else attr.text = attr[attr.type]
        delete attr[attr.type]

        return attr
      })
    })
  }
}
