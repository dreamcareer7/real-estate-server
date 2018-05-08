const _ = require('lodash')
const excel = require('../../utils/convert_to_excel')
const momentTz = require('moment-timezone')
const promisify = require('util').promisify
const Contact = require('./')
const ADDRESS_PARTS = ['city', 'street_name', 'country', 'postal_code', 'state'] 

function getAddressWithLabel(obj, label) {
  const returnObj = {}
  let index = null
  for (const address of obj) {
    for (const addressPartName of ADDRESS_PARTS) {
      for (const part of _.sortBy(_.get(address, addressPartName, []), 'index')) {
        if (part.label === label) { 
          if (index && index !== part.index) {
            continue
          }
          returnObj[addressPartName] = returnObj[addressPartName] || []
          returnObj[addressPartName].push(part)
          index = index || part.index
        }
      }
    }
  }
  return returnObj
}

function findAddressForEachContact(addressesObj) {
  let contactdID = null
  const returnObj = {}
  for (const [addressPart, val] of Object.entries(addressesObj)) {
    for (const each of val) {
      if (contactdID && each.contact !== contactdID) {
        continue
      }
      returnObj[addressPart] = each.text
      contactdID = contactdID || each.contact
    }
  }
  return returnObj
}

async function getAllData(contacts) {
  const allData = []

  for (const contact of contacts) {
    const names = []
    const phones = []
    let primaryPhone = ''
    const emails = []
    let jobTitle
    let company
    const addresses = []
    const websites = []
    let birthday
    const notes = []
    const relations = []
    
    for (const sb of _.get(contact, 'sub_contacts', [])) {
      const attrs = _.groupBy(sb.attributes, 'attribute_type')
      
      names.push({
        first_name: attrs.first_name,
        middle_name: attrs.middle_name,
        last_name: attrs.last_name,
        title: attrs.title,
        nickname: attrs.nickname
      })
      
      emails.push(attrs.email)
 
      _.get(attrs, 'phone_number', []).forEach(pn => {
        phones.push(pn)
        pn.is_primary && (primaryPhone = pn.text || '')
      })
    
      _.get(attrs, 'job_title', []).forEach(jt => {
        jobTitle = jobTitle || jt.text || ''
      })
      
      _.get(attrs, 'company', []).forEach(cp => {
        company = company || cp.text || ''
      })
      
      addresses.push({
        city: attrs.city,
        country: attrs.country,
        postal_code: attrs.postal_code,
        state: attrs.state,
        street_name: attrs.street_name
      })
      
      _.get(attrs, 'website', []).forEach(ws => {
        websites.push(ws)
      })
      
      _.get(attrs, 'birthday', []).forEach(bd => {
        birthday = birthday || bd.date
      })
      
      _.get(attrs, 'note', []).forEach(nt => {
        notes.push(nt)
      })
      
      for (const r of _.get(sb, 'attributes.relations', [])) {
        const relationID = _.get(r, 'relation')
        if (relationID) {
          const relation = await promisify(Contact.get)(relationID)
          relations.push(Object.assign(relation, _.pick(r, ['label', 'is_primary'])))
        }
      }
    }
    allData.push({
      id: contact.id,
      names,
      phones,
      primaryPhone,
      emails: _.flattenDeep(emails),
      jobTitle,
      company,
      addresses,
      websites,
      birthday,
      notes,
      relations
    })
  }
  return allData
}


async function convertToOutlookCSV(contacts, httpResponse) {
  const data = await getAllData(contacts)
  const model = new excel.EntityToExcel(data)
  let businessAddresses, homeAddresses, otherAddresses
  model
    .add({
      headerName: 'First Name',
      value: contact => _.get(contact.names, '0.first_name.0.text')
    })
    .add({
      headerName: 'Middle Name',
      value: contact => _.get(contact.names, '0.middle_name.0.text')
    })
    .add({
      headerName: 'Last Name',
      value: contact => _.get(contact.names, '0.last_name.0.text')
    })
    .add({
      headerName: 'Title',
      value: contact => _.get(contact.names, '0.title.0.text')
    })
    .add({
      headerName: 'Suffix',
      value: () => ''
    })
    .add({
      headerName: 'Nickname',
      value: contact => _.get(contact.names, '0.nickname.0.text')
    })
    .add({
      headerName: 'Given Yomi',
      value: () => ''
    })
    .add({
      headerName: 'Surname Yomi',
      value: () => ''
    })
    .add({
      headerName: 'E-mail Address',
      value: contact => {
        const emails = _.get(contact, 'emails', [])
        return _.get(emails.shift(), 'text', '')
      }
    })
    .add({
      headerName: 'E-mail 2 Address',
      value: contact => {
        const emails = _.get(contact, 'emails', [])
        return _.get(emails.shift(), 'text', '')
      }
    })
    .add({
      headerName: 'E-mail 3 Address',
      value: contact => {
        const emails = _.get(contact, 'emails', [])
        return _.get(emails.shift(), 'text', '')
      }
    })
    .add({
      headerName: 'Home Phone',
      value: contact => {
        const homePhones = _.remove(contact.phones, p => p.label === 'Home')
        const first = homePhones.shift()
        contact.phones = _.concat(contact.phones, homePhones)
        return _.get(first, 'text')
      }
    })
    .add({
      headerName: 'Home Phone 2',
      value: contact => {
        const homePhones = _.remove(contact.phones, p => p.label === 'Home')
        const first = homePhones.shift()
        contact.phones = _.concat(contact.phones, homePhones)
        return _.get(first, 'text')
      }
    })
    .add({
      headerName: 'Business Phone',
      value: contact => {
        const businessPhones = _.remove(contact.phones, p => p.label === 'Business')
        const first = businessPhones.shift()
        contact.phones = _.concat(contact.phones, businessPhones)
        return _.get(first, 'text')
      }
    })
    .add({
      headerName: 'Business Phone 2',
      value: contact => {
        const businessPhones = _.remove(contact.phones, p => p.label === 'Business')
        const first = businessPhones.shift()
        contact.phones = _.concat(contact.phones, businessPhones)
        return _.get(first, 'text')
      }
    })
    .add({
      headerName: 'Mobile Phone',
      value: contact => {
        const mobilePhones = _.remove(contact.phones, p => p.label === 'Mobile')
        const first = mobilePhones.shift()
        contact.phones = _.concat(contact.phones, mobilePhones)
        return _.get(first, 'text')
      }
    })
    .add({
      headerName: 'Car Phone',
      value: () => ''
    })
    .add({
      headerName: 'Other Phone',
      value: () => ''
    })
    .add({
      headerName: 'Primary Phone',
      value: (contact) => contact.primaryPhone
    })
    .add({
      headerName: 'Pager',
      value: () => ''
    })
    .add({
      headerName: 'Business Fax',
      value: () => ''
    })
    .add({
      headerName: 'Home Fax',
      value: () => ''
    })
    .add({
      headerName: 'Other Fax',
      value: () => ''
    })
    .add({
      headerName: 'Company Main Phone',
      value: () => ''
    })
    .add({
      headerName: 'Callback',
      value: () => ''
    })
    .add({
      headerName: 'Radio Phone',
      value: () => ''
    })
    .add({
      headerName: 'Telex',
      value: () => ''
    })
    .add({
      headerName: 'TTY/TDD Phone',
      value: () => ''
    })
    .add({
      headerName: 'IMAddress',
      value: () => ''
    })
    .add({
      headerName: 'Job Title',
      value: contact => _.get(contact, 'jobTitle')
    })
    .add({
      headerName: 'Department',
      value: () => ''
    })
    .add({
      headerName: 'Company',
      value: contact => _.get(contact, 'company')
    })
    .add({
      headerName: 'Office Location',
      value: () => ''
    })
    .add({
      headerName: 'Manager\'s Name',
      value: () => ''
    })
    .add({
      headerName: 'Assistant\'s Name',
      value: () => ''
    })
    .add({
      headerName: 'Company Yomi',
      value: () => ''
    })
    .add({
      headerName: 'Business Street',
      value: contact => {
        businessAddresses = findAddressForEachContact(getAddressWithLabel(contact.addresses, 'Business'))
        return _.get(businessAddresses, 'street_name', '')
      }
    })
    .add({
      headerName: 'Business City',
      value: contact => {
        return _.get(businessAddresses, 'city', '')
      }
    })
    .add({
      headerName: 'Business State',
      value: contact => {
        return _.get(businessAddresses,'state', '')
      }
    })
    .add({
      headerName: 'Business Postal Code',
      value: contact => {
        return _.get(businessAddresses,'postal_code', '')
      }
    })
    .add({
      headerName: 'Business Country/Region',
      value: contact => {
        return _.get(businessAddresses,'country', '')
      }
    })
    .add({
      headerName: 'Home Street',
      value: contact => {
        homeAddresses = findAddressForEachContact(getAddressWithLabel(contact.addresses, 'Home'))
        return _.get(homeAddresses,'street_name', '')
      }
    })
    .add({
      headerName: 'Home City',
      value: contact => {
        return _.get(homeAddresses,'city', '')
      }
    })
    .add({
      headerName: 'Home State',
      value: contact => {
        return _.get(homeAddresses,'state', '')
      }
    })
    .add({
      headerName: 'Home Postal Code',
      value: contact => {
        return _.get(homeAddresses,'postal_code', '')
      }
    })
    .add({
      headerName: 'Home Country/Region',
      value: contact => {
        return _.get(homeAddresses,'country', '')
      }
    })
    .add({
      headerName: 'Other Street',
      value: contact => {
        otherAddresses = findAddressForEachContact(getAddressWithLabel(contact.addresses, 'Other'))
        return _.get(otherAddresses,'street_name', '')
      }
    })
    .add({
      headerName: 'Other City',
      value: contact => {
        return _.get(otherAddresses,'city', '')
      }
    })
    .add({
      headerName: 'Other State',
      value: contact => {
        return _.get(otherAddresses,'state', '')
      }
    })
    .add({
      headerName: 'Other Postal Code',
      value: contact => {
        return _.get(otherAddresses,'postal_code', '')
      }
    })
    .add({
      headerName: 'Other Country/Region',
      value: contact => {
        return _.get(otherAddresses,'country', '')
      }
    })
    .add({
      headerName: 'Personal Web Page',
      value: contact => {
        if (contact.websites.length > 1) {
          const first = _.remove(contact.websites, (w, idx) => idx === 0)
          return _.get(first, '0.text')
        }
        return ''
      }
    })
    // .add({
    //   headerName: 'Spouse',
    //   value: contact => {
    //     const spouse = _.find(contact.relations, r => r.label === 'Spouse')
    //     return `${_.get(spouse, 'summary.first_name', '')} ${_.get(spouse, 'summary.last_name', '')}`
    //   }
    // })
    .add({
      headerName: 'Schools',
      value: () => ''
    })
    .add({
      headerName: 'Hobby',
      value: () => ''
    })
    .add({
      headerName: 'Location',
      value: () => ''
    })
    .add({
      headerName: 'Web page',
      value: contact => _.get(contact.websites, '0.text')
    })
    .add({
      headerName: 'Birthday',
      value: contact => {
        const MILLIS_TO_SECONDS_RATIO = 1000
        let bday = _.get(contact, 'birthday', '')
        if (bday === '') return ''
        bday = momentTz(bday * MILLIS_TO_SECONDS_RATIO).tz('US/Central')
        return bday.isValid() ? bday.format('MM/DD/YYYY') : ''
      }
    })
    .add({
      headerName: 'Anniversary',
      value: () => ''
    })
    .add({
      headerName: 'Notes',
      value: contact => contact.notes.map(note => note.text).join('\n')
    })
  
  
  model.prepare()
  return excel.convert({
    columns: model.getHeaders(),
    rows: model.getRows()
  }, httpResponse, 'csv')
}

module.exports = {
  convertToOutlookCSV
}