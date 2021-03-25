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


/**
 * Maps (AKA refines) a microsoft-contact to an object that is easier-to-use.
 * @typedef {import('../../../../contact/defs.d.ts').Microsoft.Contact} MicrosoftContact
 * @param {MicrosoftContact[]} cons - The contacts
 * @returns {any}
 */
const refineContacts = (cons) => {
  cons
    .filter(Boolean)
    .map(con => ({
      etag: contacts.getEtag(con),
      parked: false,
      remote_id: con.id,
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
}


module.exports = {
  refineContacts
}