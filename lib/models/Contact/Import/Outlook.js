const parse = require('csv-parse')

const address = (row, contact, i) => {
  /*
   * Home Address
   * Home Street
   * Home Street 2
   * Home Street 3
   * Home Address PO Box
   * Home City
   * Home State
   * Home Postal Code
   * Home Country
   */
  const a = {}

  const street_parts = []

  if (row[i + 1])
    street_parts.push(row[i + 1])

  if (row[i + 2])
    street_parts.push(row[i + 2])

  if (row[i + 3])
    street_parts.push(row[i + 3])

  if (street_parts.length > 0)
    a.street_name = street_parts.join(' ')

  if (row[i + 4])
    a.zip_code = row[i + 4]

  if (row[i + 7])
    a.zip_code = row[i + 7]

  if (row[i + 5])
    a.city = row[i + 5]

  if (row[i + 6])
    a.state = row[i + 6]

  if (row[i + 7])
    a.country = row[i + 7]

  if (Object.keys(a).length < 1 && row[i])
    a.street_name = row[i]

  if (Object.keys(a).length < 1)
    return false

  return a
}

const fp = phone => {
  return phone
    .replace(/\s/g, '')
    .replace(/^00/, '+')
}

const saveContact = async ({user, row}) => {
  if (!row)
    throw new Error.Validation('Empty line')

  const c = {
    attributes: {
      emails: [],
      phone_numbers: [],
      names: [],
      tags: [],
      birthdays: [],
      companies: [],
      addresses: [],
      notes: [],
      job_titles: [],
      websites: [],
      source_types: [
        {
          type: 'source_type',
          source_type: 'CSV'
        },
      ]
    }
  }

  const a = c.attributes

  a.names.push({
    type: 'name',
    first_name: row[0],
    middle_name: row[1],
    last_name: row[2],
    title: row[3]
  })

  if (row[6])
    a.websites.push({
      type: 'website',
      website: row[6]
    })

  if (row[8]) {
    const d = new Date(row[8])
    const timestamp = d.getTime()

    if (!isNaN(timestamp))
      a.birthdays.push({
        type: 'birthday',
        birthday: d.getTime()
      })
  }

  if (row[13])
    a.notes.push({
      type: 'note',
      note: row[13]
    })

  if (row[14])
    a.emails.push({
      type: 'email',
      email: row[14]
    })

  if (row[15])
    a.emails.push({
      type: 'email',
      email: row[15]
    })

  if (row[16])
    a.emails.push({
      type: 'email',
      email: row[16]
    })

  if (row[17])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[17]),
      label: 'Primary Phone'
    })

  if (row[18])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[18]),
      label: 'Home Phone'
    })

  if (row[19])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[19]),
      label: 'Home Phone 2'
    })

  if (row[20])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[20]),
      label: 'Mobile Phone'
    })

  if (row[21])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[21]),
      label: 'Pager'
    })

  if (row[22])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[22]),
      label: 'Home Fax'
    })

  const home = address(row, 23)

  if (home) {
    home.label = 'Home Address'
    a.addresses.push(home)
  }

  if (row[37])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[37]),
      label: 'Company Main Phone'
    })

  if (row[38])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[38]),
      label: 'Business Phone'
    })

  if (row[39])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[39]),
      label: 'Business Phone 2'
    })

  if (row[40])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[40]),
      label: 'Business Fax'
    })

  if (row[41])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[41]),
      label: 'Assistant\'s Phone'
    })

  if (row[42])
    a.companies.push({
      type: 'company',
      company: row[42],
      label: 'Company'
    })

  const business = address(row, 49)
  if (business) {
    business.label = 'Business'
    a.addresses.push(business)
  }

  if (row[58])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[58]),
      label: 'Other Phone'
    })

  if (row[59])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[59]),
      label: 'Other Fax'
    })

  const other = address(row, 60)
  if (other) {
    other.label = 'Other'
    a.addresses.push(other)
  }

  if (row[69])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[69]),
      label: 'Callback'
    })

  if (row[70])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[70]),
      label: 'Car Phone'
    })

  if (row[71])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[71]),
      label: 'ISDN'
    })

  if (row[72])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[72]),
      label: 'Radio Phone'
    })

  if (row[73])
    a.phone_numbers.push({
      type: 'phone_number',
      phone_number: fp(row[73]),
      label: 'TTY/TDD Phone'
    })

  if (row[87]) {
    a.tags = row[87]
      .split(';')
      .map(t => {
        return {
          type: 'tag',
          tag: t
        }
      })
  }

  return Contact.add(user.id, c, {
    activity: false,
    get: false,
    relax: true
  })
}

const saveContacts = async ({contacts, user}) => {
  const errored = []
  const saved = []

  for(const row of contacts) {
    try {
      const contact = await saveContact({user, row})
      saved.push(contact)
    } catch(error) {
      console.log('>>', error)
      errored.push({
        error,
        row
      })
    }
  }

  return {
    saved,
    errored
  }
}

const work = async ({file, user}) => {
  return new Promise((resolve, reject) => {
    const contacts = []

    const parser = parse({
      delimeter: ',',
      relax_column_count: true,
      quote: '"',
      from: 2,
      trim: true
    })
    parser.on('error', reject)


    parser.on('readable', () => {
      const row = parser.read()
      if (row)
        contacts.push(row)
    })

    parser.on('finish', () => {
      if (!contacts[0] || contacts[0].length !== 89)
        throw new Error.Validation('Please upload an Outlook compatible CSV file')

      saveContacts({contacts, user})
        .catch(reject)
        .then(resolve)
    })

    file.pipe(parser)
  })
}

Contact.Import.Outlook = work