const _ = require('lodash')
const excel = require('../../utils/convert_to_excel')
const momentTz = require('moment-timezone')

module.exports = {}

function findSpouse(contactID, allContacts) {

}

function getAllEmails() {

}

function getAllPhoneNumbers(contactID, allContacts) {

}

function getAllPhones(contacts) {
  const allData = []
  contacts.forEach(contact => {
    const phones = []
    const emails = []
    let jobTitle
    let company
    const addresses = []
    const websites = []
    let birthday
    const notes = []
    _.get(contact, 'sub_contacts', []).forEach(sb => {

      _.get(sb, 'attributes.phone_numbers', []).forEach(pn => {
        phones.push(_.pick(pn, ['phone_number', 'label', 'is_primary']))
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
        addresses.push(_.pick(ad, ['address', 'label', 'is_primary']))
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

    })
    allData.push({
      id: contact.id,
      phones,
      emails,
      jobTitle,
      company,
      addresses,
      websites,
      birthday,
      notes
    })
  })
  return allData
}

function getAndRemove() {
  const first = _.first(homePhones)
  phones = _.concat(phones,_.remove(homePhones, (hp, idx) => idx != 0))
}


function convertToOutlookCSV(contacts, httpResponse) {
  let phones = getAllPhones(contacts)
  const model = new excel.EntityToExcel(contacts)
  model
    .add({
      headerName: 'First Name',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.names.0.first_name')
    })
    .add({
      headerName: 'Middle Name',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.names.0.middle_name')
    })
    .add({
      headerName: 'Last Name',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.names.0.last_name')
    })
    .add({
      headerName: 'Title',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.names.0.title')
    })
    .add({
      headerName: 'Suffix',
      value: () => ''
    })
    .add({
      headerName: 'Nickname',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.names.0.nickname')
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
      value: contact => _.get(contact, 'emails')
    })
    .add({
      headerName: 'E-mail 2 Address',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.emails.1.email')
    })
    .add({
      headerName: 'E-mail 3 Address',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.emails.2.email')
    })
    .add({
      headerName: 'Home Phone',
      value: contact => {
        const homePhones = _.remove(phones[contact.id], p => p.label === 'Home')
        const first = _.first(homePhones)
        phones = _.concat(phones,_.remove(homePhones, (hp, idx) => idx != 0))
        return _.get(first, '0.phone_number')
      }
    })
    .add({
      headerName: 'Home Phone 2',
      value: contact => {
        const homePhones = _.remove(phones[contact.id], p => p.label === 'Home')
        const first = _.first(homePhones)
        phones = _.concat(phones,_.remove(homePhones, (hp, idx) => idx != 0))
        return _.get(first, '0.phone_number')
      }
    })
    .add({
      headerName: 'Business Phone',
      value: contact => {
        const homePhones = _.get(contact, 'sub_contacts.0.attributes.phone_numbers', []).filter(p => p.label === 'Business')
        return _.get(homePhones, '0.phone_number')
      }
    })
    .add({
      headerName: 'Business Phone 2',
      value: contact => {
        const homePhones = _.get(contact, 'sub_contacts.0.attributes.phone_numbers', []).filter(p => p.label === 'Business')
        return _.get(homePhones, '1.phone_number')
      }
    })
    .add({
      headerName: 'Mobile Phone',
      value: contact => {
        const homePhones = _.get(contact, 'sub_contacts.0.attributes.phone_numbers', []).filter(p => p.label === 'Mobile')
        return _.get(homePhones, '0.phone_number')
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
      value: contact => {
        const pPhone = _.filter(phones[contact.id], p => p.is_primary)
        return _.get(pPhone, '0.phone_number')
      }
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
      value: contact => _.get(contact, 'sub_contacts.0.attributes.job_titles.0.job_title')
    })
    .add({
      headerName: 'Department',
      value: () => ''
    })
    .add({
      headerName: 'Company',
      value: contact => _.get(contact, 'sub_contacts.0.attributes.companies.0.company')
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
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Business')
        return _.get(businessAddress, '0.street_name', '')
      }
    })
    .add({
      headerName: 'Business City',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Business')
        return _.get(businessAddress, '0.city', '')
      }
    })
    .add({
      headerName: 'Business State',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Business')
        return _.get(businessAddress, '0.state', '')
      }
    })
    .add({
      headerName: 'Business Postal Code',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Business')
        return _.get(businessAddress, '0.postal_code', '')
      }
    })
    .add({
      headerName: 'Business Country/Region',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Business')
        return _.get(businessAddress, '0.country', '')
      }
    })
    .add({
      headerName: 'Home Street',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Home')
        return _.get(businessAddress, '0.street_name', '')
      }
    })
    .add({
      headerName: 'Home City',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Home')
        return _.get(businessAddress, '0.city', '')
      }
    })
    .add({
      headerName: 'Home State',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Home')
        return _.get(businessAddress, '0.state', '')
      }
    })
    .add({
      headerName: 'Home Postal Code',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Home')
        return _.get(businessAddress, '0.postal_code', '')
      }
    })
    .add({
      headerName: 'Home Country/Region',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Home')
        return _.get(businessAddress, '0.country', '')
      }
    })
    .add({
      headerName: 'Other Street',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Other')
        return _.get(businessAddress, '0.street_name', '')
      }
    })
    .add({
      headerName: 'Other City',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Other')
        return _.get(businessAddress, '0.city', '')
      }
    })
    .add({
      headerName: 'Other State',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Other')
        return _.get(businessAddress, '0.state', '')
      }
    })
    .add({
      headerName: 'Other Postal Code',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Other')
        return _.get(businessAddress, '0.postal_code', '')
      }
    })
    .add({
      headerName: 'Other Country/Region',
      value: contact => {
        const businessAddress = _.get(contact, 'sub_contacts.0.attributes.addresses', []).filter(address => address.label === 'Other')
        return _.get(businessAddress, '0.country', '')
      }
    })
    .add({
      headerName: 'Personal Web Page',
      value: () => ''
    })
    .add({
      headerName: 'Spouse',
      value: () => ''
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
      value: contact => _.get(contact, 'sub_contacts.0.attributes.websites.0.website')
    })
    .add({
      headerName: 'Birthday',
      value: contact => {
        let bday = _.get(contact, 'sub_contacts.0.attributes.birthdays.0.birthday', '')
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
      value: contact => _.get(contact, 'sub_contacts.0.attributes.notes.0.note')
    })


  model.prepare()
  return excel.convert({
    columns: model.getHeaders(),
    rows: model.getRows()
  }, httpResponse, 'csv')
}

Contact.Export = Contact.Export || {}
Contact.Export.outlookCSV = convertToOutlookCSV