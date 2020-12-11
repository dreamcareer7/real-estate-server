const _  = require('lodash')



const parseFeed = (connections) => {
  const contacts = []

  for ( const entry of connections ) {
    const url = _.get(entry, 'id.$t', '')

    const con = {
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

    con.entry_id = url.substring(_.lastIndexOf(url, '/') + 1)
    con.note     = _.get(entry, 'content.$t')
    con.website  = _.get(entry, 'gContact$website.0.href')
    con.birthday = _.get(entry, 'gContact$birthday.when')

    con.organization['jobTitle'] = _.get(entry, 'gd$organization.0.gd$orgTitle.$t')
    con.organization['company']  = _.get(entry, 'gd$organization.0.gd$orgName.$t')

    con.names = {
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
  
          con.addresses.push(addresseObj)
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

          con.emailes.push(emailObj)
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

          con.phones.push(phoneObj)
        }
      }
    }

    if (links) {
      if ( links.length > 0 ) {
        for (let i = 0; i < links.length; i ++) {

          if ( links[i]['type'] === 'image/*' && links[i]['gd$etag'] ) {
            con.photo = `https://www.google.com/m8/feeds/photos/media/default/${con.entry_id}`
          }
        }
      }
    }

    if (memberships) {
      if ( memberships.length > 0 ) {
        for (let i = 0; i < memberships.length; i ++) {

          if ( memberships[i]['deleted'] === 'false' || memberships[i]['deleted'] === false ) {
            con.groupMembership = memberships[i]['href']
          }
        }
      }
    }

    if (con.entry_id) {
      contacts.push(con)
    }
  }

  return contacts
}


module.exports = {
  parseAttributes,
  parseFeed
}