const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbPersist = require('./db-persist')
const lo = require('lodash')
const pluralize = require('pluralize')
const prettyj = require('prettyjson')

const contactPropsToGet = [
  'id',
  'lastModifiedDateTime',
  'birthday',
  'nickName',
  'givenName',
  'title',
  'jobTitle',
  'companyName',
  'homePhones',
  'mobilePhone',
  'businessPhones',
  'businessHomePage',
  'personalNotes',
  'homeAddress',
  'businessAddress',
  'otherAddress',
  'emailAddresses',
]

// This objects maps db MS Graph contact property names to our db columns
// const contactColumnMapper = {
//   'id': 'source_id',
//   'lastModifiedDateTime': 'last_modified_on_source',
//   'birthday': 'birthday',
//   'nickName': 'name.nick_name',
//   'givenName': 'name.given_name',
//   'middleName': 'name.middle_name',
//   'surname': 'name.last_name',
//   'title': 'name.title',
//   'jobTitle': 'job_title',
//   'companyName': 'company',
//   'homePhones': 'phone_number',
//   'mobilePhone': 'phone_number',
//   'businessPhones': 'phone_number',
//   'businessHomePage': 'website',
//   'personalNotes': 'note',
//   'homeAddress': 'address', // Is an object
//   'businessAddress': 'address', // Is an object
//   'otherAddress': 'address', // Is an object
//   'emailAddresses': 'email' // Is an array
// }

// function swapKeys(oldAndNewKeyNames, dataObj) {
//   const returnObj = {}
//   for (const oldKey in oldAndNewKeyNames) {
//     const newKey = oldAndNewKeyNames[oldKey]
//     if (returnObj[newKey]) {
//       returnObj[newKey].push(dataObj[oldKey])
//     } else {
//       returnObj[newKey] = [dataObj[oldKey]]
//     }
//   }
//   return returnObj
// }


// const anotherMapper = {
//   'id': 'source_id',
//   'lastModifiedDateTime': 'last_modified_on_source',
//   'birthday': 'birthday',
//   'nickName': 'name.nick_name',
//   'givenName': 'name.given_name',
//   'middleName': 'name.middle_name',
//   'surname': 'name.last_name',
//   'title': 'name.title',
//   'jobTitle': 'job_title',
//   'companyName': 'company',
//   'homePhones': {
//     mapTo: 'phone_number',
//     type: 'array'
//   },
//   'mobilePhone': 'phone_number',
//   'businessPhones': {
//     mapTo: 'phone_number',
//     type: 'array'
//   },
//   'businessHomePage': 'website',
//   'personalNotes': 'note',
//   'homeAddress': {
//     mapTo: 'address',
//     type: 'object',
//     value: x => {
//       return {
//         'street': x.street,
//         city: x.city,
//         state: x.state,
//         country: x.countryOrOrigin,
//         postal_code: x.postalCode
//       }
//     }
//   },
//   'businessAddress': {
//     mapTo: 'address',
//     type: 'object',
//     value: x => {
//       return {
//         street: x.street,
//         city: x.city,
//         state: x.state,
//         country: x.countryOrOrigin,
//         postal_code: x.postalCode
//       }
//     }
//   },
//   'otherAddress': {
//     mapTo: 'address',
//     type: 'object',
//     value: x => {
//       return {
//         street: x.street,
//         city: x.city,
//         state: x.state,
//         country: x.countryOrOrigin,
//         postal_code: x.postalCode
//       }
//     }
//   },
//   'emailAddresses': {
//     mapTo: 'email',
//     type: 'array',
//     value: x => x.address
//   }
// }

// function prepareData(data, mapper) {
//   const prepared = []
//
//   data.forEach(item => {
//     const contact = {
//       type: 'contact',
//       attributes: {}
//     }
//     const attrs = contact.attributes
//     for (const prop in item) {
//       const rule = mapper[prop]
//       if (!lo.isObject(rule)) {
//         const internalObj = {}
//         if (rule.includes('.')) {
//           const [parent, child] = rule.split('.')
//           const keyName = pluralize(parent)
//           if (attrs[keyName]) {
//             attrs[keyName][0][child] = item[prop]
//           } else {
//             internalObj[child] = item[prop]
//             internalObj['type'] = parent
//             contact.attributes[pluralize(parent)] = [internalObj]
//           }
//         } else {
//           internalObj[rule] = item[prop]
//           internalObj['type'] = rule
//           contact.attributes[pluralize(rule)] = [internalObj]
//         }
//
//       } else {
//         switch (rule.type) {
//           case 'array':
//
//             break
//           default:
//         }
//       }
//
//     }
//
//
//     prepared.push(contact)
//   })
//   return prepared
// }

// This objects maps db MS Graph contact property names to our db columns
const msGraphToDBMapper = {
  'source_id': 'id',
  'last_modified_on_source': 'lastModifiedDateTime',
  'birthday': 'birthday',
  'job_title': 'jobTitle',
  'website': 'businessHomePage',
  'note': 'personalNotes',
  'company': 'companyName',
  'name': {
    propName: [
      'nickName',
      'givenName',
      'middleName',
      'surName',
      'title'
    ],
    value(nName, gName, mName, sName, title) {
      return [{
        nick_name: nName,
        given_name: gName,
        middle_name: mName,
        sure_name: sName,
        title,
        type: 'name'
      }]
    }
  },
  'phone_number': {
    propName: ['homePhones', 'mobilePhone', 'businessPhones'],
    value(hPhones, mPhone, bPhones) {
      const finalObj = []
      hPhones.forEach((phone) => {
        finalObj.push({
          'phone': phone,
          type: 'phone'
        })
      })
      bPhones.forEach((phone) => {
        finalObj.push({
          'phone': phone,
          type: 'phone'
        })
      })
      finalObj.push({
        'phone': mPhone,
        'type': 'phone'
      })
      return finalObj
    }
  },
  'email': {
    propName: 'emailAddresses',
    value(emailAdresses) {
      const finalObj = []
      emailAdresses.forEach(emailAdress => {
        finalObj.push({
          'email': emailAdress,
          'type': 'email'
        })
      })
      return finalObj
    }
  },
  'address': {
    propName: ['homeAddress', 'businessAddress', 'otherAddress'],
    value(ha, ba, oa) {
      const finalObj = []
      const type = 'address'

      !lo.isEmpty(ha) &&
        finalObj.push({
          'type': 'home ' + type,
          'address': {
            'street_name': ha.street,
            'city': ha.city,
            'state': ha.state,
            'country': ha.countryOrOrigin,
            'postal_code': ha.postalCode
          }
        })

      if (!lo.isEmpty(ba)) {
        finalObj.push({
          'type': 'business ' + type,
          'address': {
            'street_name': ba.street,
            'city': ba.city,
            'state': ba.state,
            'country': ba.countryOrOrigin,
            'postal_code': ba.postalCode
          }
        })
      }

      if (!lo.isEmpty(oa)) {
        finalObj.push({
          'type': 'other ' + type,
          'address': {
            'street_name': oa.street,
            'city': oa.city,
            'state': oa.state,
            'country': oa.countryOrOrigin,
            'postal_code': oa.postalCode
          }
        })
      }
      return finalObj
    }
  }
}

function convertData(originalData, mappingRules) {
  const converted = {}
  let ruleValue
  for (const rule in mappingRules) {
    originalData.forEach(item => {
      ruleValue = mappingRules[rule]
      // Extract simple ruleValue values
      if (lo.isString(ruleValue)) {
        if (!lo.isNil(item[ruleValue])) {
          const targetKey = pluralize(rule)
          converted[targetKey] = {
            'type': rule,
            [rule]: item[ruleValue]
          }
        }
      }

      if (lo.isObject(ruleValue)) {
        if (lo.isArray(ruleValue.propName)) {
          const values = []
          ruleValue.propName.forEach(prop => {
            values.push(item[prop])
          })
          const result = lo.isFunction(ruleValue.value) && ruleValue.value.apply(null, values)
          const targetKey = pluralize(rule)
          converted[targetKey] = {
            [rule]: result
          }
        }
      }

    })
  }
  return converted
}

async function authorizationDone(data) {
  try {
    const authData = await auth.authorize(data.code)
    const userInfoToBePersisted = {
      refreshToken: authData.refresh_token,
      accessToken: authData.access_token,
      expiresIn: authData.expires_in
    }
    await util.saveUserInfo(data.authInfo.user, userInfoToBePersisted)

    const contacts = await adapter.getContacts(userInfoToBePersisted.accessToken, contactPropsToGet)

    const convd = convertData(contacts.value, msGraphToDBMapper)
    console.log(prettyj.render(convd))

    // dbPersist.saveContacts(data.authInfo.user, changed)
  } catch (e) {
    console.log('Error happened', e)
  }
}

module.exports = {
  redirectHandler: function (expressApp) {
    require('./web-routes')(expressApp)
      .then(authorizationDone)
  }
}