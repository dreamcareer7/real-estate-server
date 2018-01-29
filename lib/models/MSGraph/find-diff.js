// const lo = require('lodash')
const diff = require('deep-diff')
const lo = require('lodash')
const pluralize = require('pluralize')
const PROP_NOT_FOUND = '__NOT_FOUND__'

// When a user import from Outlook for a second time, for any contact that's fetched from the external service
// (Microsoft in this case) there could be a number of different cases:
//
//
// We don't have the contact in our system. That happens if the contact was created in Outlook after the first import. IMPORTING.
//
//
// We already have the contact in our system. It hasn't changed in outlook since the first import. It hasn't changed in Rechat. IGNORING.
//
//
//
// We already have the contact in our system. It has changed in outlook since the first import. It hasn't changed in Rechat.
//  Add new info from Outlook. Don't delete anything already on Rechat.
//
//
// We already have the contact in our system. It hasn't changed in outlook since the first import. It has changed in Rechat. IGNORING.
//
// We already have the contact in our system. It has changed in outlook since the first import. It has changed in Rechat. IGNORING
//
//
//
//
//
//
// We import contact from outlook, then later delete in Rechat, next time we do a sync we need to IGNORE it and do not re-add i,
// user obviously does not want that contact to be in Rechat

function compareSourceId(newContact, contacts) {
  return contacts.find(x => newContact.id === x.subcontacts.attributes.source_ids[0])
}

function ifContactChangedOnSource(newContact, oldContact) {
  return newContact.lastModifiendOnSource === oldContact.subcontacts.attributes.last_modified_on_source[0]
}

function compare(leftObj, rightObj) {
  const res = diff.diff(leftObj, rightObj)
  console.log(res)
}


function compareAll(currentContacts, newContacts) {
  const totallyNew = []
  const changed = []
  const addAttribute = []
  newContacts.forEach(x => {
    const newSourceID = lo.first(x.source_ids).source_id
    const found = currentContacts.find(y => {
      return lo.first(lo.first(y.sub_contacts).attributes.source_ids).source_id === newSourceID
    })

    if (lo.isNil(found)) {
      return totallyNew.push(x)
    }

    if (getProp(found, 'last_modified_on_source') === lo.first(x.last_modified_on_sources).last_modified_on_source) {
      return
    }

    for (const key in x) {
      let newValue
      if (key === 'names') {
        newValue = lo.first(x[key])
      } else {
        newValue = lo.get(lo.first(x[key]), pluralize.singular(key), PROP_NOT_FOUND)
      }
      if (newValue === PROP_NOT_FOUND) {
        continue
      }
      const oldValue = getProp(found, pluralize.singular(key))
      if (newValue !== oldValue) {
        if (getPropId(found, pluralize.singular(key)) === PROP_NOT_FOUND) {
          addAttribute.push({
            id: found.id,
            prop: pluralize.singular(key),
            propID: getPropId(found, pluralize.singular(key)),
            value: newValue
          })
        } else {
          changed.push({
            id: found.id,
            prop: pluralize.singular(key),
            propID: getPropId(found, pluralize.singular(key)),
            value: newValue
          })
        }
      }

    }
  })
  return {
    totallyNew,
    changed,
    addAttribute
  }
}

function getProp(obj, propName) {
  return lo.get(lo.first(lo.first(obj.sub_contacts).attributes[pluralize(propName)]), propName, PROP_NOT_FOUND)
}

function getPropId(obj, propName) {
  return lo.get(lo.first(lo.first(obj.sub_contacts).attributes[pluralize(propName)]), 'id', PROP_NOT_FOUND)
}

module.exports = {
  compare,
  compareAll
}