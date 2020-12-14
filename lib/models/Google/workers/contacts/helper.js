const getEntryId = (metadata) => {
  if ( metadata?.objectType !== 'PERSON' ) {
    return null
  }

  const result = metadata.sources.filter(source => (source.type === 'CONTACT')).map(source => source.id)
  return result[0]
}

const getNames = (names) => {
  const result = names.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => {
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
  const result = nicknames.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
  return result[0]
}

const getPhoto = (photos) => {
  const result = photos.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.url)
  return result[0]
}

const getBirthday = (birthdays) => {
  const result = birthdays.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.text)
  return result[0]
}

const getWebsite = (urls) => {
  const result = urls.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
  return result[0]
}

const getOrganization = (organizations) => {
  const result = organizations.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => {
    return {
      jobTitle: record.name,
      company: record.title
    }
  })

  return result[0]
}

const getNote = (biographies) => {
  const result = biographies.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'CONTACT')).map(record => record.value)
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

const refineConnections = (connections) => {
  const contacts = connections
    .filter(connection => connection.metadata.objectType === 'PERSON')
    .map(connection => {

      // old id of google contacts apis v3 
      const resource_id  = connection.resourceName
      const entry_id     = connection.metadata ? getEntryId(connection.metadata) : null
      const names        = connection.names ? getNames(connection.names) : null
      const nickName     = connection.nicknames ? getNickname(connection.nicknames) : null
      const photo        = connection.photos ? getPhoto(connection.photos) : null
      const birthday     = connection.birthdays ? getBirthday(connection.birthdays) : null
      const website      = connection.urls ? getWebsite(connection.urls) : null
      const organization = connection.organizations ? getOrganization(connection.organizations) : null
      const note         = connection.biographies ? getNote(connection.biographies) : null
      const phones       = connection.phoneNumbers ? getPhones(connection.phoneNumbers) : null
      const emailes      = connection.emailAddresses ? getEmails(connection.emailAddresses) : null
      const addresses    = connection.addresses ? getAddresses(connection.addresses) : null
      const memberships  = connection.memberships ? getMemberships(connection.memberships) : null
      
      if ( !resource_id || !entry_id ) {
        return false
      }

      return {
        etag: connection.etag,
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
  refineConnections
}