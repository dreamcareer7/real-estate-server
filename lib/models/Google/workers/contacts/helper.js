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

const getNote = (biographies) => {
  const result = biographies.filter(record => record.metadata.primary).map(record => record.value)
  return result[0]
}

const getPhones = (phoneNumbers) => {
  const result = phoneNumbers.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
    return {
      value: record.value,
      type: record.type
    }
  })

  return result
}

const getEmails = (emailAddresses) => {
  const result = emailAddresses.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
    return {
      value: record.value,
      type: record.type
    }
  })

  return result
}

const getAddresses = (addresses) => {
  const result = addresses.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
    return {
      streetAddress: record.streetAddress,
      extendedAddress: record.extendedAddress,
      city: record.city,
      postalCode: record.postalCode,
      country: record.country,
      countryCode: record.countryCode,
      type: record.type
    }
  })

  return result
}

const getMemberships = (memberships) => {
  const result = memberships.filter(record => record?.metadata?.source?.type === 'CONTACT').map(record => {
    return record.contactGroupMembership
  })

  return result
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
      const nickName     = getNickname(connection.nicknames)
      const photo        = getPhoto(connection.photos)
      const birthday     = getBirthday(connection.birthdays)
      const website      = getWebsite(connection.urls)
      const organization = getOrganization(connection.organizations)
      const note         = getNote(connection.biographies)
      const phones       = getPhones(connection.phoneNumbers)
      const emailes      = getEmails(connection.emailAddresses)
      const addresses    = getAddresses(connection.addresses)
      const memberships  = getMemberships(connection.memberships)
      
      return {
        resource_id,
        entry_id,
        names,
        nickName,
        photo,
        birthday,
        website,
        organization,
        note,
        phones,
        emailes,
        addresses,
        memberships
      }
    })

  return contacts
}


module.exports = {
  parseFeed
}