const lo = require('lodash')
const pluralize = require('pluralize')

const UNIX_TIME_CONVERTION_RATIO = 1000
const CST_TIME_ZONE_DIFFERENCE = -7 * 3600 

const contactPropsToGet = [
  'id',
  'lastModifiedDateTime',
  'birthday',
  'nickName',
  'givenName',
  'surName',
  'title',
  'middleName',
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
  'last_modified_on_source': {
    propName: 'lastModifiedDateTime',
    value(time) {
      return [{
        type: 'last_modified_on_source',
        'last_modified_on_source': (new Date(time)).getTime() / UNIX_TIME_CONVERTION_RATIO + CST_TIME_ZONE_DIFFERENCE
      }]
    }
  },
  'birthday': {
    propName: 'birthday',
    value(time) {
      return [{
        type: 'birthday',
        'birthday': (new Date(time)).getTime() / UNIX_TIME_CONVERTION_RATIO + CST_TIME_ZONE_DIFFERENCE
      }]
    }
  },
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
      const obj = {type: 'name'}
      nName && (obj.nickname = nName)
      gName && (obj.first_name = gName)
      mName && (obj.middle_name = mName)
      sName && (obj.last_name = sName)
      title && (obj.title = title)
      return [obj]
    }
  },

  'phone_number': {
    propName: ['homePhones', 'mobilePhone', 'businessPhones'],
    value(hPhones, mPhone, bPhones) {
      const finalObj = []
      const propName = 'phone_number'
      hPhones.forEach((phone) => {
        finalObj.push({
          [propName]: phone,
          type: 'phone_number',
          'label': 'Home'
        })
      })
      bPhones.forEach((phone) => {
        finalObj.push({
          [propName]: phone,
          type: 'phone_number',
          'label': 'Mobile'
        })
      })
      mPhone && finalObj.push({
        [propName]: mPhone,
        'type': 'phone_number',
        'label': 'Business'
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
        'type': type,
        'street_name': ha.street,
        'city': ha.city,
        'state': ha.state,
        'country': ha.countryOrRegion,
        'postal_code': ha.postalCode,
        'label': 'Home'
      })

      if (!lo.isEmpty(ba)) {
        finalObj.push({
          'type': type,
          'street_name': ba.street,
          'city': ba.city,
          'state': ba.state,
          'country': ba.countryOrRegion,
          'postal_code': ba.postalCode,
          'label': 'Business'
        })
      }

      if (!lo.isEmpty(oa)) {
        finalObj.push({
          'type': type,
          'street_name': oa.street,
          'city': oa.city,
          'state': oa.state,
          'country': oa.countryOrRegion,
          'postal_code': oa.postalCode,
          'label': 'Other'
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
        if (!lo.isNil(item[ruleValue]) && !lo.isEmpty(item[ruleValue])) {
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
          if (!lo.isNil(item[ruleValue.propName]) && !lo.isEmpty(item[ruleValue.propName])) {
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

module.exports = {
  contactPropsToGet,
  msGraphToDBMapper,
  convertData
}