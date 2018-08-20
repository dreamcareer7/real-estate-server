const lo = require('lodash')
const loadAttributeDefs = require('./db-adapter').loadAttributeDefs
const addressIndexHelper = require('./util').AddressIndexHelper

const UNIX_TIME_CONVERTION_RATIO = 1000
const ADDRESSES_INDEX_INITIAL_VALUE = 1

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

const labels = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
  mobile: 'Mobile'
}

const DATE = 'date',
  NUMBER = 'number'

// This objects maps db MS Graph contact property names to our db columns
const msGraphToDBMapper = {
  'source_id': 'id',
  'job_title': 'jobTitle',
  'website': 'businessHomePage',
  'note': 'personalNotes',
  'company': 'companyName',
  'title': 'title',
  'first_name': 'givenName',
  'last_name': 'surname',
  'nickname': 'nickName',
  'middle_name': 'middleName',

  'last_modified_on_source': {
    propName: 'lastModifiedDateTime',
    value(time) {
      return (new Date(time)).getTime() / UNIX_TIME_CONVERTION_RATIO
    },
    type: DATE
  },

  'birthday': {
    propName: 'birthday',
    value(time) {
      return (new Date(time)).getTime() / UNIX_TIME_CONVERTION_RATIO
    },
    type: DATE
  },

  'phone_number': {
    propName: ['homePhones', 'mobilePhone', 'businessPhones'],
    value(hPhones, mPhone, bPhones, defID) {
      const finalObj = []
      hPhones.forEach((phone) => {
        finalObj.push({
          text: phone,
          label: labels.home,
          attribute_def: defID
        })
      })
      mPhone && finalObj.push({
        text: mPhone,
        label: labels.mobile,
        attribute_def: defID
      })
      bPhones.forEach((phone) => {
        finalObj.push({
          text: phone,
          // The main label in outlook is business, but we do not have that in Rechat. Instead we use Work label
          // 'label': 'Business',
          'label': labels.work,
          attribute_def: defID
        })
      })
      return finalObj
    }
  },

  'email': {
    // We should pass in array since the emailAddresses is an array itself
    propName: ['emailAddresses'],
    value(emailAdresses, defID) {
      const finalObj = []
      emailAdresses.forEach(emailAdress => {
        finalObj.push({
          'text': emailAdress.address,
          attribute_def: defID
        })
      })
      return finalObj
    }
  },

  'street_name': {
    propName: ['homeAddress', 'businessAddress', 'otherAddress'],
    value(ha, ba, oa, defID, g) {
      const finalObj = []
      const addressIndexer = new addressIndexHelper(ADDRESSES_INDEX_INITIAL_VALUE)
      g.addressIndexer = addressIndexer
      lo.get(ha, 'street', false) &&
        finalObj.push({
          text: ha.street,
          attribute_def: defID,
          label: labels.home,
          index: addressIndexer.getIndexFor('Home')
        })

      lo.get(ba, 'street', false) &&
        finalObj.push({
          text: ba.street,
          attribute_def: defID,
          // The main label in outlook is business, but we do not have that in Rechat. Instead we use Work label
          // 'label': 'Business',
          'label': labels.work,
          index: addressIndexer.getIndexFor('Business')
        })

      lo.get(oa, 'street', false) &&
        finalObj.push({
          text: oa.street,
          attribute_def: defID,
          'label': labels.other,
          index: addressIndexer.getIndexFor('Other')
        })

      return finalObj
    }
  },

  'city': {
    propName: ['homeAddress', 'businessAddress', 'otherAddress'],
    value(ha, ba, oa, defID, g) {
      const finalObj = []

      lo.get(ha, 'city', false) &&
        finalObj.push({
          text: ha.city,
          attribute_def: defID,
          label: labels.home,
          index: g.addressIndexer.getIndexFor('Home')
        })

      lo.get(ba, 'city', false) &&
        finalObj.push({
          text: ba.city,
          attribute_def: defID,
          // The main label in outlook is business, but we do not have that in Rechat. Instead we use Work label
          // 'label': 'Business',
          'label': labels.work,
          index: g.addressIndexer.getIndexFor('Business')
        })

      lo.get(oa, 'city', false) &&
        finalObj.push({
          text: oa.city,
          attribute_def: defID,
          'label': labels.other,
          index: g.addressIndexer.getIndexFor('Other')
        })
      return finalObj
    }
  },

  'state': {
    propName: ['homeAddress', 'businessAddress', 'otherAddress'],
    value(ha, ba, oa, defID, g) {
      const finalObj = []

      lo.get(ha, 'state', false) &&
        finalObj.push({
          text: ha.state,
          attribute_def: defID,
          label: labels.home,
          index: g.addressIndexer.getIndexFor('Home')
        })

      lo.get(ba, 'state', false) &&
        finalObj.push({
          text: ba.state,
          attribute_def: defID,
          // The main label in outlook is business, but we do not have that in Rechat. Instead we use Work label
          // 'label': 'Business',
          'label': labels.work,
          index: g.addressIndexer.getIndexFor('Business')
        })

      lo.get(oa, 'state', false) &&
        finalObj.push({
          text: oa.state,
          attribute_def: defID,
          'label': labels.other,
          index: g.addressIndexer.getIndexFor('Other')
        })

      return finalObj
    }
  },

  'country': {
    propName: ['homeAddress', 'businessAddress', 'otherAddress'],
    value(ha, ba, oa, defID, g) {
      const finalObj = []

      lo.get(ha, 'countryOrRegion', false) &&
        finalObj.push({
          text: ha.countryOrRegion,
          attribute_def: defID,
          label: labels.home,
          index: g.addressIndexer.getIndexFor('Home')
        })

      lo.get(ba, 'countryOrRegion', false) &&
        finalObj.push({
          text: ba.countryOrRegion,
          attribute_def: defID,
          // The main label in outlook is business, but we do not have that in Rechat. Instead we use Work label
          // 'label': 'Business',
          'label': labels.work,
          index: g.addressIndexer.getIndexFor('Business')
        })

      lo.get(oa, 'countryOrRegion', false) &&
        finalObj.push({
          text: oa.countryOrRegion,
          attribute_def: defID,
          'label': labels.other,
          index: g.addressIndexer.getIndexFor('Other')
        })

      return finalObj
    }
  },

  'postal_code': {
    propName: ['homeAddress', 'businessAddress', 'otherAddress'],
    value(ha, ba, oa, defID, g) {
      const finalObj = []

      lo.get(ha, 'postalCode', false) &&
        finalObj.push({
          text: ha.postalCode,
          attribute_def: defID,
          label: labels.home,
          index: g.addressIndexer.getIndexFor('Home')
        })

      lo.get(ba, 'postalCode', false) &&
        finalObj.push({
          text: ba.postalCode,
          attribute_def: defID,
          // The main label in outlook is business, but we do not have that in Rechat. Instead we use Work label
          // 'label': 'Business',
          'label': labels.work,
          index: g.addressIndexer.getIndexFor('Business')
        })

      lo.get(oa, 'postalCode', false) &&
        finalObj.push({
          text: oa.postalCode,
          attribute_def: defID,
          'label': labels.other,
          index: g.addressIndexer.getIndexFor('Other')
        })

      return finalObj
    }
  }
}

async function convertData(originalData, mappingRules, userID) {
  const allConverted = []
  let ruleValue
  const global = {}

  for (const item of originalData) {
    const converted = {}

    for (const rule in mappingRules) {
      ruleValue = mappingRules[rule]

      // Extract simple ruleValue values
      if (lo.isString(ruleValue)) {
        if (!lo.isEmpty(item[ruleValue])) {
          converted[rule] = [{
            text: item[ruleValue],
            attribute_def: (await loadAttributeDefs(userID))[rule].id
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
          const result = lo.isFunction(ruleValue.value) && ruleValue.value.apply(null,
            values.concat((await loadAttributeDefs(userID))[rule].id).concat(global))
          converted[rule] = result
        }

        if (lo.isString(ruleValue.propName)) {
          if (!lo.isEmpty(item[ruleValue.propName])) {
            const result = lo.isFunction(ruleValue.value) && ruleValue.value.call(null, item[ruleValue.propName], global)
            const value = {
              attribute_def: (await loadAttributeDefs(userID))[rule].id
            }
            switch (ruleValue.type) {
              case DATE:
                value.date = result
                break
              case NUMBER:
                value.number = result
                break
              default:
                value.text = result
            }
            converted[rule] = [value]
          }
        }
      }
    }

    allConverted.push(converted)
  }

  return allConverted
}

module.exports = {
  contactPropsToGet,
  msGraphToDBMapper,
  convertData
}