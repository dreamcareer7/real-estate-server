const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbPersist = require('./db-persist')
const lo = require('lodash')
const pluralize = require('pluralize')
const prettyj = require('prettyjson')
require('../../../scripts/connection')
require('../../../lib/utils/db')

const contactPropsToGet = [
  'id',
  'lastModifiedDateTime',
  'birthday',
  'nickName',
  'givenName',
  'surName',
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
      'surname',
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
          'email': emailAdress.address,
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
  const allConverted = []
  let ruleValue
  originalData.forEach(item => {
    const converted = {}
    for (const rule in mappingRules) {
      ruleValue = mappingRules[rule]

      // Extract simple ruleValue values
      if (lo.isString(ruleValue)) {
        if (!lo.isNil(item[ruleValue])) {
          const targetKey = pluralize(rule)
          converted[targetKey] = [{
            'type': rule,
            [rule]: item[ruleValue]
          }]
        }
      }

      if (lo.isObject(ruleValue)) {
        // Array prop names
        if (lo.isArray(ruleValue.propName)) {
          const values = []
          ruleValue.propName.forEach(prop => {
            values.push(item[prop])
          })
          const result = lo.isFunction(ruleValue.value) && ruleValue.value.apply(null, values)
          const targetKey = pluralize(rule)
          converted[targetKey] = result
        }

        if (lo.isString(ruleValue.propName)) {
          if (!lo.isNil(item[ruleValue.propName])) {
            const result = lo.isFunction(ruleValue.value) && ruleValue.value.call(null, item[ruleValue.propName])
            const targetKey = pluralize(rule)
            converted[targetKey] = result
          }
        }
      }
    }
    allConverted.push(converted)
  })
  return allConverted
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
    // const IMPORTED_FROM_OUTLOOK = 'External/Outlook'
    // const currentContacts = await Contact.getByAttribute(data.authInfo.user, 'source_type', [IMPORTED_FROM_OUTLOOK])
    // console.log(currentContacts)
    console.log(prettyj.render(convd))
    dbPersist.saveContacts(data.authInfo.user, convd)
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