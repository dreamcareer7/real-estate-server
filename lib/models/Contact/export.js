const _ = require('lodash')
const excel = require('../../utils/convert_to_excel')
// const momentTz = require('moment-timezone')
const promisify = require('util').promisify
const Contact = require('./')
const ADDRESS_PARTS = ['city', 'street_name', 'country', 'postal_code', 'state'] 

// function getAddressWithLabel(obj, label) {
//   const returnObj = {}
//   let index = null
//   for (const address of obj) {
//     for (const addressPartName of ADDRESS_PARTS) {
//       for (const part of _.sortBy(_.get(address, addressPartName, []), 'index')) {
//         if (part.label === label) {
//           if (index && index !== part.index) {
//             continue
//           }
//           returnObj[addressPartName] = returnObj[addressPartName] || []
//           returnObj[addressPartName].push(part)
//           index = index || part.index
//         }
//       }
//     }
//   }
//   return returnObj
// }

// function findAddressForEachContact(addressesObj) {
//   let contactdID = null
//   const returnObj = {}
//   for (const [addressPart, val] of Object.entries(addressesObj)) {
//     for (const each of val) {
//       if (contactdID && each.contact !== contactdID) {
//         continue
//       }
//       returnObj[addressPart] = each.text
//       contactdID = contactdID || each.contact
//     }
//   }
//   return returnObj
// }

async function getAllData(contacts) {
  const allData = []
  
  const maxCounts = {
    email: 0,
    phone: 0,
    address: 0
  }
  
  
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
        nickname: attrs.nickname,
        marketing_name: attrs.marketing_name
      })
      
      emails.push(attrs.email)
      if (attrs.email) {
        maxCounts.email = Math.max(maxCounts.email, attrs.email.length)
      }
      
 
      for (const pn of attrs.phone_number || []){
        phones.push(pn)
        pn.is_primary && (primaryPhone = pn.text || '')
      }
      if (attrs.phone_number) {
        maxCounts.phone = Math.max(maxCounts.phone, attrs.phone_number.length)
      }
    
      for (const jt of attrs.job_title || []) {
        jobTitle = jobTitle || jt.text || ''
      }
      
      for (const cp of attrs.company || []) {
        company = company || cp.text || ''
      }
      
      addresses.push({
        city: attrs.city,
        country: attrs.country,
        postal_code: attrs.postal_code,
        state: attrs.state,
        street_name: attrs.street_name
      })
      for (const addressPart of ADDRESS_PARTS) {
        if (attrs[addressPart]) {
          maxCounts.address = Math.max(maxCounts.address, attrs[addressPart].length)
        }
      }
      
      
      for (const ws of attrs.website || []) {
        websites.push(ws)
      }
      
      for (const bd of attrs.birthday || []) {
        birthday = birthday || bd.date
      }
      
      for (const nt of attrs.note || []) {
        notes.push(nt)
      }

      for (const r of sb.attributes.relations || []) {
        const relationID = r.relation
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
  return {allData, maxCounts}
}


async function convertToOutlookCSV(contacts, httpResponse) {
  const {allData: data, maxCounts} = await getAllData(contacts)
  const descriptions = [
    {
      header: 'Title',
      value: (contact, index) => _.get(contact, `names.0.title.${index}.text`, ''),
      size: 1
    },
    {
      header: 'First Name',
      value: (contact, index) => _.get(contact, `names.0.first_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Last Name',
      value: (contact, index) => _.get(contact, `names.0.last_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Marketing Name',
      value: (contact, index) => _.get(contact, `names.0.marketing_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Middle Name',
      value: (contact, index) => _.get(contact, `names.0.middle_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Nick Name',
      value: (contact, index) => _.get(contact, `names.0.nickname.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Phone',
      value: (contact, index) => {
        const label = _.get(contact, `phones.${index}.label`, false)
        const labelText = label ? ` (${label})` : ''
        return _.get(contact, `phones.${index}.text`, '') + labelText
      },
      size: maxCounts.phone
    },
    {
      header: 'Email',
      value: (contact, index) => {
        const label = _.get(contact, `emails.${index}.label`, false)
        const labelText = label ? ` (${label})` : ''
        return _.get(contact, `emails.${index}.text`, '') + labelText
      },
      size: maxCounts.email
    },
    {
      header: [
        'Street Number',
        'Street Name',
        'City',
        'State',
        'Postal Code',
        'Country'
      ],
      value: [
        (contact, index) => {
          const label = _.get(contact, `addresses.0.street_number.${index}.label`, false)
          const labelText = label ? ` (${label})` : ''
          return _.get(contact, `addresses.0.street_number.${index}.text`, '') + labelText
        },
        (contact, index) => {
          const label = _.get(contact, `addresses.0.street_name.${index}.label`, false)
          const labelText = label ? ` (${label})` : ''
          return _.get(contact, `addresses.0.street_name.${index}.text`, '') + labelText
        },
        (contact, index) => {
          const label = _.get(contact, `addresses.0.city.${index}.label`, false)
          const labelText = label ? ` (${label})` : ''
          return _.get(contact, `addresses.0.city.${index}.text`, '') + labelText
        },
        (contact, index) => {
          const label = _.get(contact, `addresses.0.State.${index}.label`, false)
          const labelText = label ? ` (${label})` : ''
          return _.get(contact, `addresses.0.state.${index}.text`, '') + labelText
        },
        (contact, index) => {
          const label = _.get(contact, `addresses.0.postal_code.${index}.label`, false)
          const labelText = label ? ` (${label})` : ''
          return _.get(contact, `addresses.0.postal_code.${index}.text`, '') + labelText
        },
        (contact, index) => {
          const label = _.get(contact, `addresses.0.country.${index}.label`, false)
          const labelText = label ? ` (${label})` : ''
          return _.get(contact, `addresses.0.country.${index}.text`, '') + labelText
        }
      ],
      size: maxCounts.address,
      // parts: ADDRESS_PARTS
    },
    // {
    //   header: 'City',
    //   value: (contact, index, part) => _.get(contact, `addresses.${index}.${part}.0.text`, ''),
    //   size: maxCounts.address,
    //   parts: ADDRESS_PARTS
    // }
  ]
  const model = new excel.VariableHeaderEntityToTable(data, descriptions)
  // let businessAddresses, homeAddresses, otherAddresses
  // model
  //   .add({
  //     headerName: 'Title',
  //     value: contact => _.get(contact.names, '0.title.0.text', '')
  //   })
  //   .add({
  //     headerName: 'First Name',
  //     value: contact => _.get(contact.names, '0.first_name.0.text', '')
  //   })
  //   .add({
  //     headerName: 'Last Name',
  //     value: contact => _.get(contact.names, '0.last_name.0.text', '')
  //   })
  //   .add({
  //     headerName: 'Marketing Name',
  //     value: contact => _.get(contact.names, '0.marketing_name.0.text', '')
  //   })
  //   .add({
  //     headerName: 'Middle Name',
  //     value: contact => _.get(contact.names, '0.middle_name.0.text', '')
  //   })
  //   .add({
  //     headerName: 'Nickname',
  //     value: contact => _.get(contact.names, '0.nickname.0.text', '')
  //   })
  //   .add({
  //     headerName: 'Home Phone',
  //     value: contact => {
  //       const homePhones = _.remove(contact.phones, p => p.label === 'Home')
  //       const first = homePhones.shift()
  //       contact.phones = _.concat(contact.phones, homePhones)
  //       return _.get(first, 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Home Phone 2',
  //     value: contact => {
  //       const homePhones = _.remove(contact.phones, p => p.label === 'Home')
  //       const first = homePhones.shift()
  //       contact.phones = _.concat(contact.phones, homePhones)
  //       return _.get(first, 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Work Phone',
  //     value: contact => {
  //       const businessPhones = _.remove(contact.phones, p => p.label === 'Business' || p.label === 'Work')
  //       const first = businessPhones.shift()
  //       contact.phones = _.concat(contact.phones, businessPhones)
  //       return _.get(first, 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Work Phone 2',
  //     value: contact => {
  //       const businessPhones = _.remove(contact.phones, p => p.label === 'Business' || p.label === 'Work')
  //       const first = businessPhones.shift()
  //       contact.phones = _.concat(contact.phones, businessPhones)
  //       return _.get(first, 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Mobile Phone',
  //     value: contact => {
  //       const mobilePhones = _.remove(contact.phones, p => p.label === 'Mobile')
  //       const first = mobilePhones.shift()
  //       contact.phones = _.concat(contact.phones, mobilePhones)
  //       return _.get(first, 'text', '')
  //     }
  //   })
  //   // .add({
  //   //   headerName: 'Car Phone',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'Other Phone',
  //     value: contact => {
  //       const otherPhones = _.remove(contact.phones, p => p.label === 'Other')
  //       const first = otherPhones.shift()
  //       contact.phones = _.concat(contact.phones, otherPhones)
  //       return _.get(first, 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Primary Phone',
  //     value: (contact) => contact.primaryPhone
  //   })
  //   // .add({
  //   //   headerName: 'Pager',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Business Fax',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Home Fax',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Other Fax',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Company Main Phone',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Callback',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Radio Phone',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Telex',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'TTY/TDD Phone',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'E-mail Address',
  //     value: contact => {
  //       const emails = _.get(contact, 'emails', [])
  //       return _.get(emails.shift(), 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'E-mail 2 Address',
  //     value: contact => {
  //       const emails = _.get(contact, 'emails', [])
  //       return _.get(emails.shift(), 'text', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'E-mail 3 Address',
  //     value: contact => {
  //       const emails = _.get(contact, 'emails', [])
  //       return _.get(emails.shift(), 'text', '')
  //     }
  //   })
  //   // .add({
  //   //   headerName: 'IMAddress',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'Job Title',
  //     value: contact => _.get(contact, 'jobTitle', '')
  //   })
  //   // .add({
  //   //   headerName: 'Department',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'Company',
  //     value: contact => _.get(contact, 'company', '')
  //   })
  //   // .add({
  //   //   headerName: 'Office Location',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Manager\'s Name',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Assistant\'s Name',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Company Yomi',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'Work Street',
  //     value: contact => {
  //       businessAddresses = findAddressForEachContact(getAddressWithLabel(contact.addresses, 'Work'))
  //       return _.get(businessAddresses, 'street_name', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Work City',
  //     value: contact => {
  //       return _.get(businessAddresses, 'city', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Work State',
  //     value: contact => {
  //       return _.get(businessAddresses,'state', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Work Postal Code',
  //     value: contact => {
  //       return _.get(businessAddresses,'postal_code', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Work Country/Region',
  //     value: contact => {
  //       return _.get(businessAddresses,'country', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Home Street',
  //     value: contact => {
  //       homeAddresses = findAddressForEachContact(getAddressWithLabel(contact.addresses, 'Home'))
  //       return _.get(homeAddresses,'street_name', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Home City',
  //     value: contact => {
  //       return _.get(homeAddresses,'city', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Home State',
  //     value: contact => {
  //       return _.get(homeAddresses,'state', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Home Postal Code',
  //     value: contact => {
  //       return _.get(homeAddresses,'postal_code', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Home Country/Region',
  //     value: contact => {
  //       return _.get(homeAddresses,'country', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Other Street',
  //     value: contact => {
  //       otherAddresses = findAddressForEachContact(getAddressWithLabel(contact.addresses, 'Other'))
  //       return _.get(otherAddresses,'street_name', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Other City',
  //     value: contact => {
  //       return _.get(otherAddresses,'city', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Other State',
  //     value: contact => {
  //       return _.get(otherAddresses,'state', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Other Postal Code',
  //     value: contact => {
  //       return _.get(otherAddresses,'postal_code', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Other Country/Region',
  //     value: contact => {
  //       return _.get(otherAddresses,'country', '')
  //     }
  //   })
  //   .add({
  //     headerName: 'Personal Web Page',
  //     value: contact => {
  //       if (contact.websites.length > 1) {
  //         const first = _.remove(contact.websites, (w, idx) => idx === 0)
  //         return _.get(first, '0.text')
  //       }
  //       return ''
  //     }
  //   })
  //   // .add({
  //   //   headerName: 'Spouse',
  //   //   value: contact => {
  //   //     const spouse = _.find(contact.relations, r => r.label === 'Spouse')
  //   //     return `${_.get(spouse, 'summary.first_name', '')} ${_.get(spouse, 'summary.last_name', '')}`
  //   //   }
  //   // })
  //   // .add({
  //   //   headerName: 'Schools',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Hobby',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Location',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'Web page',
  //     value: contact => _.get(contact.websites, '0.text', '')
  //   })
  //   .add({
  //     headerName: 'Birthday',
  //     value: contact => {
  //       const MILLIS_TO_SECONDS_RATIO = 1000
  //       let bday = _.get(contact, 'birthday', '')
  //       if (bday === '') return ''
  //       bday = momentTz(bday * MILLIS_TO_SECONDS_RATIO).tz('US/Central')
  //       return bday.isValid() ? bday.format('MM/DD/YYYY') : ''
  //     }
  //   })
  //   // .add({
  //   //   headerName: 'Anniversary',
  //   //   value: () => ''
  //   // })
  //   .add({
  //     headerName: 'Notes',
  //     value: contact => contact.notes.map(note => note.text).join('\n')
  //   })
  //   // .add({
  //   //   headerName: 'Suffix',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Given Yomi',
  //   //   value: () => ''
  //   // })
  //   // .add({
  //   //   headerName: 'Surname Yomi',
  //   //   value: () => ''
  //   // })
  //
  
  model.prepare()
  return excel.writeCSVToStream({
    columns: model.getHeaders(),
    rows: model.getRows()
  }, httpResponse)
}

module.exports = {
  convertToOutlookCSV
}