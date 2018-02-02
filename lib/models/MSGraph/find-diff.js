const lo = require('lodash')
const pluralize = require('pluralize')
const PROP_NOT_FOUND = '__NOT_FOUND__'

function compareAll(currentContacts, newContacts) {
  const totallyNew = []
  const changed = []
  const addAttribute = []

  currentContacts = currentContacts.map(cc => lo.assign(lo.first(cc.sub_contacts).attributes, {contactID: cc.id}))

  newContacts.forEach(newContact => {
    const newSourceID = lo.first(newContact.source_ids).source_id

    const matchedOldContact = currentContacts.find(y => {
      return lo.first(y.source_ids).source_id === newSourceID
    })

    if (lo.isNil(matchedOldContact)) {
      return totallyNew.push(newContact)
    }

    if (lo.isEqual(getFirstValue(matchedOldContact, 'last_modified_on_source'), getFirstValue(newContact, 'last_modified_on_source'))) {
      return
    }

    for (const newContactKey in newContact) {

      if (!newContact.hasOwnProperty(newContactKey)) {
        return
      }

      const newContactParentValue = newContact[newContactKey]

      if (!lo.isArray(newContactParentValue)) {
        return
      }

      if (newContactParentValue.length > 1 ||
        newContactKey === 'phone_numbers' ||
        newContactKey === 'emails' ||
        newContactKey === 'addresses') {

        const oldValues = matchedOldContact[newContactKey]
        if (['emails', 'phone_numbers', 'addresses'].includes(newContactKey)) {
          dbFyData(newContactParentValue, newContactKey)
        }
        newContactParentValue.forEach((ncv) => {
          if (!oldValues) {
            addAttribute.push({
              contactID: matchedOldContact.contactID,
              value: ncv,
              name: pluralize.singular(newContactKey),
            })
          } else {
            const found = oldValues.some(ov => {
              return compareObjects(ncv, ov)
            })
            if (!found) {
              addAttribute.push({
                contactID: matchedOldContact.contactID,
                value: ncv,
                name: pluralize.singular(newContactKey),
              })
            }
          }
        })

      } else if (newContactParentValue.length === 1) {
        if (newContactKey === 'names') {
          dbFyData(newContactParentValue, newContactKey)
          dbFyData(matchedOldContact[newContactKey], newContactKey)
        }
        const newContactValueForKey = lo.first(newContactParentValue)
        const oldContactValueForKey = lo.first(matchedOldContact[newContactKey])
        if (!compareObjects(newContactValueForKey, oldContactValueForKey)) {
          changed.push({
            contactID: matchedOldContact.contactID,
            value: newContactValueForKey,
            name: pluralize.singular(newContactKey),
            id: oldContactValueForKey.id
          })

        }
      }
    }
  })
  return {
    changed,
    addAttribute,
    totallyNew
  }
}

function compareObjects(source, destination, omitProps = ['created_at', 'id', 'is_primary', 'label', 'updated_at']) {
  // Prevent deleting props on original objects
  const clonedSource = Object.assign({}, source)
  const clonedDestination = Object.assign({}, destination)

  omitProps.forEach(p => {
    delete clonedDestination[p]
    delete clonedSource[p]
  })
  return lo.isEqual(clonedSource, clonedDestination)
}

function getFirstValue(obj, singularPropName) {
  return lo.get(obj, `${pluralize(singularPropName)}.0.${singularPropName}`, PROP_NOT_FOUND)
}

function dbFyData(data, type) {
  if (type === 'emails') {
    data.forEach(email => {
      email.email = email.email.toLowerCase()
    })
    return data
  }

  if (type === 'phone_numbers') {
    data.forEach(phone => {
      phone.phone_number = ObjectUtil.cleanPhoneNumber(phone.phone_number)
      try {
        phone.phone_number = ObjectUtil.formatPhoneNumberForDialing(phone.phone_number)
      }
      catch (err) {
        // What to do in case of error?
      }
      finally {
        return data
      }
    })
  }

  if (type === 'addresses' || type === 'names') {
    data.forEach(address => {
      for (let prop in address) {
        if (lo.isNil(address[prop])) {
          delete address[prop]
        }
      }
    })
    return data
  }
}

module.exports = {
  compareAll
}