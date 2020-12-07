const _  = require('lodash')


const parseAttributes = (key, entry, contactGroups) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'names' ) {
    if (entry.names.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: entry.names.givenName
      })
    }

    if (entry.names.familyName) {
      attributes.push({
        attribute_type: 'last_name',
        text: entry.names.familyName
      })
    }

    if (entry.names.additionalName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: entry.names.additionalName
      })
    }

    if (entry.names.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: entry.names.nickName
      })
    }
  }

  if (key === 'website') {
    if (entry.website)
      attributes.push({ attribute_type: 'website', text: entry.website })
  }

  if (key === 'birthday') {
    if (entry.birthday) {
      const arr = entry.birthday.split('-') // sample: 1980-10-07

      if ( arr.length === 3 ) {
        const birthday = new Date(arr[0], arr[1] - 1, arr[2], 0, 0, 0)

        attributes.push({
          attribute_type: 'birthday',
          date: birthday.getTime() / 1000
        })
      }
    }
  }

  if (key === 'note') {
    if (entry.note)
      attributes.push({ attribute_type: 'note', text: entry.note })
  }

  if (key === 'organization') {
    if (entry.organization.company)
      attributes.push({ attribute_type: 'company', text: entry.organization.company })

    if (entry.organization.jobTitle)
      attributes.push({ attribute_type: 'job_title', text: entry.organization.jobTitle })
  }

  if (key === 'groupMembership') {
    if ( contactGroups && entry.groupMembership ) {
      if (contactGroups[entry.groupMembership])
        attributes.push({ attribute_type: 'tag', text: contactGroups[entry.groupMembership] })
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < entry.addresses.length; i++) {

      const addressObj = entry.addresses[i]

      let label = 'Other'

      if ( addressObj.label.toLowerCase() === 'home' )
        label = 'Home'

      if ( addressObj.label.toLowerCase() === 'work' )
        label = 'Work'

      if ( addressObj.label.toLowerCase() === 'investment property' )
        label = 'Investment Property'
        

      if (addressObj.city) {
        attributes.push({
          attribute_type: 'city',
          text: addressObj.city,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }

      if (addressObj.country) {
        attributes.push({
          attribute_type: 'country',
          text: addressObj.country,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }

      if (addressObj.postalCode) {
        attributes.push({
          attribute_type: 'postal_code',
          text: addressObj.postalCode,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }

      if (addressObj.streetAddress) {
        attributes.push({
          attribute_type: 'street_name',
          text: addressObj.streetAddress,
          label: label,
          index: i + 1,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'emailes') {
    for (let i = 0; i < entry.emailes.length; i++) {

      const emailObj = entry.emailes[i]

      let label = 'Other'

      if ( emailObj.label.toLowerCase() === 'personal' )
        label = 'Personal'

      if ( emailObj.label.toLowerCase() === 'work' )
        label = 'Work'

      if (emailObj.address) {
        attributes.push({
          attribute_type: 'email',
          text: emailObj.address,
          label: label,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'phones') {
    for (let i = 0; i < entry.phones.length; i++) {

      const phoneObj = entry.phones[i]

      let label = 'Other'

      if ( phoneObj.label.toLowerCase() === 'home' )
        label = 'Home'

      if ( phoneObj.label.toLowerCase() === 'mobile' )
        label = 'Mobile'

      if ( phoneObj.label.toLowerCase() === 'work' )
        label = 'Work'

      if ( phoneObj.label.toLowerCase() === 'fax' )
        label = 'Fax'

      if ( phoneObj.label.toLowerCase() === 'whatsApp' )
        label = 'WhatsApp'

      if (phoneObj.phoneNumber) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phoneObj.phoneNumber,
          label: label,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  return attributes
}

const parseFeed = (entries) => {
  const connections = []

  for ( const entry of entries ) {
    const url = _.get(entry, 'id.$t', '')

    const conn = {
      entry_id: null,
      photo: '',
      note: null,
      birthday: null,
      website: null,
      groupMembership: null,
      organization: {},
      names: {},
      addresses: [],
      emailes: [],
      phones: []
    }

    conn.entry_id = url.substring(_.lastIndexOf(url, '/') + 1)
    conn.note     = _.get(entry, 'content.$t')
    conn.website  = _.get(entry, 'gContact$website.0.href')
    conn.birthday = _.get(entry, 'gContact$birthday.when')

    conn.organization['jobTitle'] = _.get(entry, 'gd$organization.0.gd$orgTitle.$t')
    conn.organization['company']  = _.get(entry, 'gd$organization.0.gd$orgName.$t')

    conn.names = {
      name: _.get(entry, 'title.$t'), // title
      givenName: _.get(entry, 'gd$name.gd$givenName.$t'),
      familyName: _.get(entry, 'gd$name.gd$familyName.$t'),
      additionalName: _.get(entry, 'gd$name.gd$additionalName.$t'), // middlename
      fullName: _.get(entry, 'gd$name.gd$fullName.$t'), // displayName
      nickName: _.get(entry, 'gContact$nickname.$t')
    }

    const addressesObj = _.get(entry, 'gd$structuredPostalAddress')
    const emailesObj   = _.get(entry, 'gd$email')
    const phonesObj    = _.get(entry, 'gd$phoneNumber')
    const links        = _.get(entry, 'link')
    const memberships  = _.get(entry, 'gContact$groupMembershipInfo')


    if (addressesObj) {
      if ( addressesObj.length > 0 ) {
        for (let i = 0; i < addressesObj.length; i ++) {
  
          let label = addressesObj[i]['label']
  
          if (!label) {
            const labelString = addressesObj[i]['rel']
            const arr = labelString.split('#')

            if (arr[1]) {
              label = arr[1]
            }
          }
  
          const addresseObj = {
            label: label
          }
  
          if ( addressesObj[i]['gd$formattedAddress'] ) {
            addresseObj['formatted'] = addressesObj[i]['gd$formattedAddress']['$t']
          }
  
          if ( addressesObj[i]['gd$street'] ) {
            addresseObj['streetAddress'] = addressesObj[i]['gd$street']['$t']
          }
  
          if ( addressesObj[i]['gd$neighborhood'] ) {
            addresseObj['extendedAddress'] = addressesObj[i]['gd$neighborhood']['$t']
          }
  
          if ( addressesObj[i]['gd$city'] ) {
            addresseObj['city'] = addressesObj[i]['gd$city']['$t']
          }
  
          if ( addressesObj[i]['gd$postcode'] ) {
            addresseObj['postalCode'] = addressesObj[i]['gd$postcode']['$t']
          }
  
          if ( addressesObj[i]['gd$country'] ) {
            addresseObj['country'] = addressesObj[i]['gd$country']['$t']
          }
  
          conn.addresses.push(addresseObj)
        }
      }
    }

    if (emailesObj) {
      if ( emailesObj.length > 0 ) {
        for (let i = 0; i < emailesObj.length; i ++) {

          let label = emailesObj[i]['label']

          if (!label) {
            const labelString = emailesObj[i]['rel']
            const arr = labelString.split('#')
            if (arr[1])
              label = arr[1]
          }

          const emailObj = {
            label: label,
            address: emailesObj[i]['address']
          }

          conn.emailes.push(emailObj)
        }
      }
    }

    if (phonesObj) {
      if ( phonesObj.length > 0 ) {
        for (let i = 0; i < phonesObj.length; i ++) {

          let label = phonesObj[i]['label']

          if (!label) {
            const labelString = phonesObj[i]['rel']
            const arr = labelString.split('#')
            if (arr[1])
              label = arr[1]
          }

          const phoneObj = {
            label: label,
            phoneNumber: phonesObj[i]['$t']
          }

          conn.phones.push(phoneObj)
        }
      }
    }

    if (links) {
      if ( links.length > 0 ) {
        for (let i = 0; i < links.length; i ++) {

          if ( links[i]['type'] === 'image/*' && links[i]['gd$etag'] ) {
            conn.photo = `https://www.google.com/m8/feeds/photos/media/default/${conn.entry_id}`
          }
        }
      }
    }

    if (memberships) {
      if ( memberships.length > 0 ) {
        for (let i = 0; i < memberships.length; i ++) {

          if ( memberships[i]['deleted'] === 'false' || memberships[i]['deleted'] === false ) {
            conn.groupMembership = memberships[i]['href']
          }
        }
      }
    }

    if (conn.entry_id) {
      connections.push(conn)
    }
  }

  return connections
}


module.exports = {
  parseAttributes,
  parseFeed
}