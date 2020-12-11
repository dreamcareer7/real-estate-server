const _  = require('lodash')


const getEntryId = (metadata) => {
  const result = metadata.sources.filter(source => (source.type === 'CONTACT')).map(source => source.id)
  return result[0]
}

const getNames = (names) => {
  const result = names.filter(record => record.metadata.primary).map(record => {
    return {
      displayName: record.displayName,
      fullName: record.displayName,
      familyName: record.familyName,
      givenName: record.givenName,
      additionalName: ''
    }
  })

  return result[0]
}

const getNickname = (nicknames) => {
  const result = nicknames.filter(record => record.metadata.primary).map(record => record.value)
  return result[0]
}

const getPhoto = (photos) => {
  const result = photos.filter(record => record.metadata.primary).map(record => record.url)
  return result[0]
}

const getBirthday = (birthdays) => {
  const result = birthdays.filter(record => record.metadata.primary).map(record => record.text)
  return result[0]
}

const getWebsite = (urls) => {
  const result = urls.filter(record => record.metadata.primary).map(record => record.value)
  return result[0]
}

const getOrganization = (organizations) => {
  const result = organizations.filter(record => record.metadata.primary).map(record => {
    return {
      jobTitle: record.name,
      company: record.title
    }
  })

  return result[0]
}


const parseFeed = (connections) => {

  const contacts = connections
    .filter(connection => {
      if ( connection.metadata.objectType !== 'PERSON' ) {
        return false
      }      
    })
    .map(connection => {

      // old id of google contacts apis v3 
      const resource_id  = connection.resourceName
      const entry_id     = getEntryId(connection.metadata)
      const names        = getNames(connection.names)
      const nickName     = getNames(connection.nicknames)
      const photo        = getNames(connection.photos)
      const birthday     = getBirthday(connection.birthdays)
      const website      = getWebsite(connection.urls)
      const organization = getOrganization(connection.organizations)
      

    })


  for ( const connection of connections ) {
    
    const con = {
      note: null,
      groupMembership: null,
      addresses: [],
      emailes: [],
      phones: []
    }

    con.note     = _.get(connection, 'content.$t')

    const addressesObj = _.get(connection, 'gd$structuredPostalAddress')
    const emailesObj   = _.get(connection, 'gd$email')
    const phonesObj    = _.get(connection, 'gd$phoneNumber')
    const links        = _.get(connection, 'link')
    const memberships  = _.get(connection, 'gContact$groupMembershipInfo')


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
            con.photo = `https://www.google.com/m8/feeds/photos/media/default/${con.resource_id}`
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

    

    contacts.push(con)
  }

  return contacts
}


module.exports = {
  parseFeed
}