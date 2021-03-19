const config = require('../../../../../../config')

const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date)
}

/**
 * Contains some helper functions used in process of contact 'refining'.
 * Currently, the implementation attempts to be same as Google-side AMAP.
 * TODO: Probably this makes no sense to be same as Google.
 * TODO: Add unit tests!
 */
const contacts = {
  getNames: (con) => {
    return {
      ...(con.displayName ? { displayName: con.displayName } : null),
      ...(con.givenName ? { givenName: con.givenName } : null),
      ...(con.surname ? { familyName: con.surname } : null),
      ...(con.middleName ? { middleName: con.middleName } : null),
    }
  },

  getPhoto: (photos) => {
    /* TODO: implement or remove this function */
    throw new Error('Not implemented yet.')
  },

  getBirthday: (birthday) => {
    return birthday && isValidDate(new Date(birthday)) ? birthday : null
  },

  getPhones: ({ homePhones, businessPhones, mobilePhones }) => {
    return [
      ...(homePhones ?? []).map(hp => ({ type: 'home', value: hp })),
      ...(businessPhones ?? []).map(bp => ({ type: 'work', value: bp })),
      ...(mobilePhones ?? []).map(mp => ({ type: 'mobile', value: mp })),
    ]
  },

  getEmails: (emailAddresses) => {
    return (emailAddresses ?? []).map(e => ({
      value: e.address,
      type: 'other',
    }))
  },

  getAddresses: ({ businessAddress, homeAddress, otherAddress }) => {
    const addresses = []

    businessAddress && (addresses.push({ ...businessAddress, type: 'work' }))
    homeAddress && (addresses.push({ ...homeAddress, type: 'home' }))
    otherAddress && (addresses.push({ ...otherAddress, type: 'other' }))

    return addresses.map(addr => ({
      streetAddress: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.countryOrRegion,
      /* TODO: Convert country-name to country-code */
      // countryCode: record.countryCode,
      state: addr.state,
      type: addr.type        
    }))
  },

  getClientData (extensions) {
    if (!Array.isArray(extensions)) { return [] }
    
    const extName = config.microsoft_integration.openExtension.contact.name

    return extensions
      .filter(e => e.extensionName === extName)
      .filter(e => e.rechat_credential && e.rechat_contact)
      .map(e => ({
        key: 'rechatCredential:' + e.rechat_credential,
        value: 'rechatContact:' + e.rechat_contact,
      }))
  },

  getEtag (contact) {
    return contact['@odata.etag'] ?? contact.lastModifiedDateTime ?? null
  }
}

const otherContacts = {
  getEntryId: (metadata) => {
    if ( metadata?.objectType !== 'PERSON' ) {
      return null
    }
  
    const result = metadata.sources.filter(source => (source.type === 'OTHER_CONTACT')).map(source => source.id)
    return result[0]
  },

  getNames: (names) => {
    const result = names.filter(record => (record?.metadata?.primary && record?.metadata?.source?.type === 'OTHER_CONTACT')).map(record => {
      return {
        displayName: record.displayName,
        fullName: record.displayName,
        familyName: record.familyName,
        givenName: record.givenName,
        middleName: null
      }
    })
  
    return result[0]
  },

  getPhones: (phoneNumbers) => {
    const result = phoneNumbers.filter(record => record?.metadata?.source?.type === 'OTHER_CONTACT').map(record => {
      return {
        value: record.value,
        type: record.type
      }
    })
  
    return result
  },

  getEmails: (emailAddresses) => {
    const result = emailAddresses.filter(record => record?.metadata?.source?.type === 'OTHER_CONTACT').map(record => {
      return {
        value: record.value,
        type: record.type
      }
    })
  
    return result
  }
}

/**
 * Maps (AKA refines) a microsoft-contact to an object that is easier-to-use.
 * @typedef {import('../../../../contact/defs.d.ts').Microsoft.Contact} MicrosoftContact
 * @param {MicrosoftContact[]} cons - The contacts
 * @returns {any}
 */
const refineContacts = cons => cons
  .filter(Boolean)
  .map(con => ({
    etag: contacts.getEtag(con),
    parked: false,
    resource_id: con.id,
    entry_id: con.id,
    names: contacts.getNames(con),
    nickName: con.nickName ?? null,
    photo: null,
    birthday: contacts.getBirthday(con.birthday),
    website: con.businessHomePage,
    organization: con.companyName ?? [],
    note: con.personalNotes,
    phones: contacts.getPhones(con),
    emailes: contacts.getEmails(con.emailAddresses),
    addresses: contacts.getAddresses(con),
    memberships: [],
    clientData: contacts.getClientData(con.extensions),
  }))

/* TODO: seems this function is not needed anymore */
const refineConnections = (connections) => {
  const deleted = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? contacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('people/').pop()

      return {
        etag: con.etag,
        parked: false,
        resource_id,
        entry_id
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  const confirmed = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && !con.metadata.deleted))
    .map(con => {
      const entry_id     = con.id
      const resource_id  = con.id
      const names        = contacts.getNames(con)
      const nickName     = con.nickname ?? null
      // const photo        = con.photos ? contacts.getPhoto(con.photos) : null
      const birthday     = contacts.getBirthday(con.birthday)
      const website      = con.businessHomePage ?? null
      const organization = con.companyName ?? null
      const note         = con.personalNotes ?? null
      const phones       = contacts.getPhones(con)
      const emailes      = contacts.getEmails(con.emailAddresses)
      const addresses    = contacts.getAddresses(con)
      const memberships  = []
      const clientData   = contacts.getClientData(con.extensions ?? [])

      return {
        etag: contacts.getEtag(con),
        parked: false,
        resource_id,
        entry_id,
        names,
        nickName,
        photo: null,
        birthday,
        website,
        organization,
        note,
        phones,
        emailes,
        addresses,
        memberships,
        clientData
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  return {
    confirmed,
    deleted
  }
}

const refineOtherContacts = (connections) => {
  const deleted = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? otherContacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('otherContacts/').pop()

      return {
        etag: con.etag,
        parked: true,
        resource_id,
        entry_id
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  const confirmed = connections
    .filter(c => !c.error)
    .filter(con => ((con?.metadata?.objectType === 'PERSON') && !con.metadata.deleted))
    .map(con => {

      // old id of google contacts apis v3 
      const entry_id     = con.metadata ? otherContacts.getEntryId(con.metadata) : null
      const resource_id  = con.resourceName.split('otherContacts/').pop()
      const names        = con.names ? otherContacts.getNames(con.names) : []
      const phones       = con.phoneNumbers ? otherContacts.getPhones(con.phoneNumbers) : []
      const emailes      = con.emailAddresses ? otherContacts.getEmails(con.emailAddresses) : []

      return {
        etag: con.etag,
        parked: true,
        resource_id,
        entry_id,
        names,
        phones,
        emailes,

        nickName: null,
        photo: null,
        birthday: null,
        website: null,
        organization: null,
        note: null,
        addresses: [],
        memberships: []
      }
    })
    .filter(con => con.resource_id && con.entry_id)

  return {
    confirmed,
    deleted
  }
}


module.exports = {
  refineConnections,
  refineOtherContacts,
  refineContacts,
}
