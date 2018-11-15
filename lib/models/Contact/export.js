const _ = require('lodash')
const excel = require('../../utils/convert_to_excel')

const ADDRESS_PARTS = ['city', 'street_name', 'country', 'postal_code', 'state']

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

    const attrs = _.groupBy(contact.attributes, 'attribute_type')

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

    for (const pn of attrs.phone_number || []) {
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
        maxCounts.address = Math.max(
          maxCounts.address,
          attrs[addressPart].length
        )
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
  return { allData, maxCounts }
}

function getAddressPart(part, contact, index) {
  return _.get(contact, `addresses.0.${part}.${index}.text`, '')
}

async function convertToOutlookCSV(contacts, httpResponse) {
  const { allData: data, maxCounts } = await getAllData(contacts)

  const descriptions = [
    {
      header: 'Title',
      value: (contact, index) =>
        _.get(contact, `names.0.title.${index}.text`, ''),
      size: 1
    },
    {
      header: 'First Name',
      value: (contact, index) =>
        _.get(contact, `names.0.first_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Last Name',
      value: (contact, index) =>
        _.get(contact, `names.0.last_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Marketing Name',
      value: (contact, index) =>
        _.get(contact, `names.0.marketing_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Middle Name',
      value: (contact, index) =>
        _.get(contact, `names.0.middle_name.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Nick Name',
      value: (contact, index) =>
        _.get(contact, `names.0.nickname.${index}.text`, ''),
      size: 1
    },
    {
      header: 'Phone',
      value: (contact, index) => {
        return _.get(contact, `phones.${index}.text`, '')
      },
      size: maxCounts.phone
    },
    {
      header: 'Email',
      value: (contact, index) => {
        return _.get(contact, `emails.${index}.text`, '')
      },
      size: maxCounts.email
    },
    {
      header: ['Country', 'City', 'State', 'Street Name', 'Postal Code'],
      value: [
        _.curry(getAddressPart)('country'),
        _.curry(getAddressPart)('city'),
        _.curry(getAddressPart)('state'),
        _.curry(getAddressPart)('street_name'),
        _.curry(getAddressPart)('postal_code')
      ],
      size: maxCounts.address
    }
  ]
  const model = new excel.VariableHeaderEntityToTable(data, descriptions)

  model.prepare()
  return excel.writeCSVToStream(
    {
      columns: model.getHeaders(),
      rows: model.getRows()
    },
    httpResponse
  )
}

module.exports = {
  convertToOutlookCSV
}
