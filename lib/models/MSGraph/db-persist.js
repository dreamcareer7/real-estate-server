require('../../../scripts/connection')
require('../../../lib/utils/db')
// require('../../../lib/models/index.js')


async function saveContacts(userID, data) {
  console.log(data)

  // data.forEach(x => {
  //   const contact = {
  //     type: 'contact',
  //     attributes: {}
  //   }
  //
  //   for (const key in x) {
  //     // if we had only one value
  //     if (x[key].length === 1 && x[key][0]) {
  //       const internalObj = {}
  //       if (key.includes('.')) {
  //         const [parent, child] = key.split('.')
  //         const keyName = pluralize(parent)
  //         if (contact.attributes[keyName]) {
  //           contact.attributes[keyName][0][child] = x[key][0]
  //         } else {
  //           internalObj[child] = x[key][0]
  //           internalObj['type'] = parent
  //           contact.attributes[pluralize(parent)] = [internalObj]
  //         }
  //       } else {
  //         internalObj[key] = x[key][0]
  //         internalObj['type'] = key
  //         contact.attributes[pluralize(key)] = [internalObj]
  //       }

  // if (lo.isArray(x[key][0])) {
  //   // const arrayOfValues = []
  //   // x[key][0].reduce((y, z) => {
  //   //   if (y === z) {
  //   //     return y
  //   //   }
  //   //   internalObj = {}
  //   //   internalObj[key] = x[key][0]
  //   //   internalObj['type'] = key
  //   //   arrayOfValues.push(internalObj)
  //   //   return z
  //   // }, '')
  //   // contact.attributes[pluralize(key)] = arrayOfValues
  // } else if (lo.isObject(x[key][0])) {
  //   internalObj[key] = internalObj[key] = x[key][0]
  //   internalObj['type'] = key
  //   contact.attributes[pluralize(key)] = [internalObj]
  // } else if (key.includes('.')) {
  //   const [parent, child] = key.split('.')
  //   const keyName = pluralize(parent)
  //   if (contact.attributes[keyName]) {
  //     contact.attributes[keyName][0][child] = x[key][0]
  //   } else {
  //     internalObj[child] = x[key][0]
  //     internalObj['type'] = parent
  //     contact.attributes[pluralize(parent)] = [internalObj]
  //   }
  // } else {
  //   internalObj[key] = x[key][0]
  //   internalObj['type'] = key
  //   contact.attributes[pluralize(key)] = [internalObj]
  // }
  // } else if (x[key].length > 1) {
  //   const allValues = []
  //   x[key].forEach(y => {
  //     if (!lo.isEmpty(y)) {
  //       const internalObj = {}
  //       internalObj[key] = y
  //       internalObj['type'] = key
  //       allValues.push(internalObj)
  //     }
  //   })
  //   contact.attributes[pluralize(key)] = allValues
  // }

  // }
  // console.log(contact)
  // })
// const c = {
//   type: 'contact',
//   attributes: {
//     source_ids: [
//       {
//         type: 'source_id',
//         source_id: 'abcdefg'
//       }
//     ],
//     last_modified_on_source: [
//       {
//         type: 'last_modified_on_source',
//         'last_modified_on_source': '2018-01-22T11:33:54Z'
//       }
//     ],
//
//
//     emails: [
//       {
//         type: 'email',
//         email: 'gary.smith@email.com'
//       },
//     ],
//     names: [
//       {
//         first_name: 'Gary',
//         last_name: 'Smith',
//         type: 'name'
//       }
//     ],
//     phone_numbers: [
//       {
//         phone_number: '(734) 555 1213',
//         type: 'phone_number'
//       }
//     ],
//     source_types: [
//       {
//         source_type: 'Outlook',
//         type: 'source_type'
//       }
//     ],
//     stages: [
//       {
//         stage: 'General',
//         type: 'stage'
//       }
//     ]
//
//   }
// }
//
// saveContactForUser(userID, c)

// Contact.getForUser(userID, {
//   filter: null,
//   timestamp: Date.now() / 1000,
//   limit: 10000,
//   type: 'Init_U'
// }, (err, contacts) => {
//   if (err) {
//     console.log(err)
//   }
//   console.log(contacts[0].sub_contacts)
// })
}

function saveContactForUser(userID, contact) {
  Contact.add(userID, contact, (err, result) => {
    if (err) {
      console.log('something is wrong', err)
    }
    console.log('Saving done')
  })
}


module.exports = {
  saveContacts
}