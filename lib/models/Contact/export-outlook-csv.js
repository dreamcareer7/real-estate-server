const _ = require('lodash')
const excel = require('../../utils/convert_to_excel')
const momentTz = require('moment-timezone')
const promisify = require('util').promisify

module.exports = {}

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
      _.get(sb, 'attributes.names', []).forEach(name => {
        names.push(_.pick(name, ['first_name', 'middle_name', 'last_name', 'title', 'nickname', 'label', 'is_primary']))
      })
      
      _.get(sb, 'attributes.phone_numbers', []).forEach(pn => {
        phones.push(_.pick(pn, ['phone_number', 'label', 'is_primary']))
        pn.is_primary && (primaryPhone = pn.phone_number || '')
      })
      
      _.get(sb, 'attributes.emails', []).forEach(em => {
        emails.push(_.pick(em, ['email', 'label', 'is_primary']))
      })
      
      _.get(sb, 'attributes.job_titles', []).forEach(jt => {
        jobTitle = jobTitle || _.pick(jt, 'job_title')
      })
      
      _.get(sb, 'attributes.companies', []).forEach(cp => {
        company = company || _.pick(cp, 'company')
      })
      
      _.get(sb, 'attributes.addresses', []).forEach(ad => {
        addresses.push(_.pick(ad, ['city', 'country', 'postal_code', 'state', 'street_name', 'label', 'is_primary']))
      })
      
      _.get(sb, 'attributes.websites', []).forEach(ws => {
        websites.push(_.pick(ws, ['website', 'label', 'is_primary']))
      })
      
      _.get(sb, 'attributes.birthdays', []).forEach(bd => {
        birthday = birthday || _.pick(bd, 'birthday')
      })
      
      _.get(sb, 'attributes.notes', []).forEach(nt => {
        notes.push(_.pick(nt, ['note', 'label', 'is_primary']))
      })
      
      for (const r of _.get(sb, 'attributes.relations', [])) {
        const relationID = _.get(r, 'relation')
        if (relationID) {
          const relation = await promisify(Contact.get)(relationID)
          relations.push(Object.assign(relation, _.pick(r, ['label', 'is_primary'])))
        }
      }
      
      allData.push({
        id: contact.id,
        names,
        phones,
        primaryPhone,
        emails,
        jobTitle,
        company,
        addresses,
        websites,
        birthday,
        notes,
        relations
      })
    }
  }
  return allData
}

async function convertToOutlookCSV(contacts, httpResponse) {
  const data = await getAllData(contacts)
  const model = new excel.EntityToExcel(data)
  model
    .add({
      headerName: 'First Name',
      value: contact => _.get(contact.names, '0.first_name')
    })
    .add({
      headerName: 'Middle Name',
      value: contact => _.get(contact.names, '0.middle_name')
    })
    .add({
      headerName: 'Last Name',
      value: contact => _.get(contact.names, '0.last_name')
    })
    .add({
      headerName: 'Title',
      value: contact => _.get(contact.names, '0.title')
    })
    .add({
      headerName: 'Suffix',
      value: () => ''
    })
    .add({
      headerName: 'Nickname',
      value: contact => _.get(contact.names, '0.nickname')
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
        return _.get(emails.shift(), 'email', '')
      }
    })
    .add({
      headerName: 'E-mail 2 Address',
      value: contact => {
        const emails = _.get(contact, 'emails', [])
        return _.get(emails.shift(), 'email', '')
      }
    })
    .add({
      headerName: 'E-mail 3 Address',
      value: contact => {
        const emails = _.get(contact, 'emails', [])
        return _.get(emails.shift(), 'email', '')
      }
    })
    .add({
      headerName: 'Home Phone',
      value: contact => {
        const homePhones = _.remove(contact.phones, p => p.label === 'Home')
        const first = homePhones.shift()
        contact.phones = _.concat(contact.phones, homePhones)
        return _.get(first, 'phone_number')
      }
    })
    .add({
      headerName: 'Home Phone 2',
      value: contact => {
        const homePhones = _.remove(contact.phones, p => p.label === 'Home')
        const first = homePhones.shift()
        contact.phones = _.concat(contact.phones, homePhones)
        return _.get(first, 'phone_number')
      }
    })
    .add({
      headerName: 'Business Phone',
      value: contact => {
        const businessPhones = _.remove(contact.phones, p => p.label === 'Business')
        const first = businessPhones.shift()
        contact.phones = _.concat(contact.phones, businessPhones)
        return _.get(first, 'phone_number')
      }
    })
    .add({
      headerName: 'Business Phone 2',
      value: contact => {
        const businessPhones = _.remove(contact.phones, p => p.label === 'Business')
        const first = businessPhones.shift()
        contact.phones = _.concat(contact.phones, businessPhones)
        return _.get(first, 'phone_number')
      }
    })
    .add({
      headerName: 'Mobile Phone',
      value: contact => {
        const mobilePhones = _.remove(contact.phones, p => p.label === 'Mobile')
        const first = mobilePhones.shift()
        contact.phones = _.concat(contact.phones, mobilePhones)
        return _.get(first, 'phone_number')
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
      value: contact => _.get(contact, 'jobTitle.job_title')
    })
    .add({
      headerName: 'Department',
      value: () => ''
    })
    .add({
      headerName: 'Company',
      value: contact => _.get(contact, 'company.company')
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
        const businessAddresses = _.filter(contact.addresses, p => p.label === 'Business')
        return _.get(businessAddresses, '0.street_name', '')
      }
    })
    .add({
      headerName: 'Business City',
      value: contact => {
        const businessAddresses = _.filter(contact.addresses, p => p.label === 'Business')
        return _.get(businessAddresses, '0.city', '')
      }
    })
    .add({
      headerName: 'Business State',
      value: contact => {
        const businessAddresses = _.filter(contact.addresses, p => p.label === 'Business')
        return _.get(businessAddresses, '0.state', '')
      }
    })
    .add({
      headerName: 'Business Postal Code',
      value: contact => {
        const businessAddresses = _.filter(contact.addresses, p => p.label === 'Business')
        return _.get(businessAddresses, '0.postal_code', '')
      }
    })
    .add({
      headerName: 'Business Country/Region',
      value: contact => {
        const businessAddresses = _.filter(contact.addresses, p => p.label === 'Business')
        return _.get(businessAddresses, '0.country', '')
      }
    })
    .add({
      headerName: 'Home Street',
      value: contact => {
        const homeAddresses = _.filter(contact.addresses, p => p.label === 'Home')
        return _.get(homeAddresses, '0.street_name', '')
      }
    })
    .add({
      headerName: 'Home City',
      value: contact => {
        const homeAddresses = _.filter(contact.addresses, p => p.label === 'Home')
        return _.get(homeAddresses, '0.city', '')
      }
    })
    .add({
      headerName: 'Home State',
      value: contact => {
        const homeAddresses = _.filter(contact.addresses, p => p.label === 'Home')
        return _.get(homeAddresses, '0.state', '')
      }
    })
    .add({
      headerName: 'Home Postal Code',
      value: contact => {
        const homeAddresses = _.filter(contact.addresses, p => p.label === 'Home')
        return _.get(homeAddresses, '0.postal_code', '')
      }
    })
    .add({
      headerName: 'Home Country/Region',
      value: contact => {
        const homeAddresses = _.filter(contact.addresses, p => p.label === 'Home')
        return _.get(homeAddresses, '0.country', '')
      }
    })
    .add({
      headerName: 'Other Street',
      value: contact => {
        const otherAddresses = _.filter(contact.addresses, p => p.label === 'Other')
        return _.get(otherAddresses, '0.street_name', '')
      }
    })
    .add({
      headerName: 'Other City',
      value: contact => {
        const otherAddresses = _.filter(contact.addresses, p => p.label === 'Other')
        return _.get(otherAddresses, '0.city', '')
      }
    })
    .add({
      headerName: 'Other State',
      value: contact => {
        const otherAddresses = _.filter(contact.addresses, p => p.label === 'Other')
        return _.get(otherAddresses, '0.state', '')
      }
    })
    .add({
      headerName: 'Other Postal Code',
      value: contact => {
        const otherAddresses = _.filter(contact.addresses, p => p.label === 'Other')
        return _.get(otherAddresses, '0.postal_code', '')
      }
    })
    .add({
      headerName: 'Other Country/Region',
      value: contact => {
        const otherAddresses = _.filter(contact.addresses, p => p.label === 'Other')
        return _.get(otherAddresses, '0.country', '')
      }
    })
    .add({
      headerName: 'Personal Web Page',
      value: contact => {
        if (contact.websites.length > 1) {
          const first = _.remove(contact.websites, (w, idx) => idx === 0)
          return _.get(first, '0.website')
        }
        return ''
      }
    })
    .add({
      headerName: 'Spouse',
      value: contact => {
        const spouse = _.find(contact.relations, r => r.label === 'Spouse')
        return `${_.get(spouse, 'summary.first_name', '')} ${_.get(spouse, 'summary.last_name', '')}`
      }
    })
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
      value: contact => _.get(contact.websites, '0.website')
    })
    .add({
      headerName: 'Birthday',
      value: contact => {
        let bday = _.get(contact, 'birthday.birthday', '')
        bday = momentTz(bday).tz('US/Central')
        return bday.isValid() ? bday.format('MM/DD/YYYY') : ''
      }
    })
    .add({
      headerName: 'Anniversary',
      value: () => ''
    })
    .add({
      headerName: 'Notes',
      value: contact => contact.notes.map(note => note.note).join('\n')
    })
  
  
  model.prepare()
  return excel.convert({
    columns: model.getHeaders(),
    rows: model.getRows()
  }, httpResponse, 'csv')
}

Contact.Export = Contact.Export || {}
Contact.Export.outlookCSV = convertToOutlookCSV