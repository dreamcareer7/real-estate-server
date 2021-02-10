const { isEqual, groupBy } = require('lodash')


const parseAttributes = (key, resource, contactGroups) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'names' ) {
    if (resource?.names?.givenName) {
      attributes.push({
        attribute_type: 'first_name',
        text: resource.names.givenName
      })
    }

    if (resource?.names?.familyName) {
      attributes.push({
        attribute_type: 'last_name',
        text: resource.names.familyName
      })
    }

    if (resource?.names?.middleName) {
      attributes.push({
        attribute_type: 'middle_name',
        text: resource.names.middleName
      })
    }

    if (resource?.nickName) {
      attributes.push({
        attribute_type: 'nickname',
        text: resource.nickName
      })
    }
  }

  if (key === 'website') {
    if (resource.website) {
      attributes.push({ attribute_type: 'website', text: resource.website })
    }
  }

  if (key === 'birthday') {
    if (resource.birthday) {
      const temp     = new Date(resource.birthday)
      const tzOffset = temp.getTimezoneOffset() * 60000
      const birthday = new Date(temp.getTime() - tzOffset)
      
      attributes.push({
        attribute_type: 'birthday',
        date: birthday.getTime() / 1000
      })
    }
  }

  if (key === 'note') {
    if (resource.note) {
      attributes.push({ attribute_type: 'note', text: resource.note })
    }
  }

  if (key === 'organization') {
    if (resource?.organization?.company) {
      attributes.push({ attribute_type: 'company', text: resource.organization.company })
    }

    if (resource?.organization?.jobTitle) {
      attributes.push({ attribute_type: 'job_title', text: resource.organization.jobTitle })
    }
  }

  if (key === 'memberships') {
    if (resource.memberships) {
      for ( const membership of resource.memberships ) {
        const gname = membership.contactGroupResourceName

        if ( gname && contactGroups[gname] ) {
          attributes.push({ attribute_type: 'tag', text: contactGroups[gname] })  
        }
      }
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < resource.addresses.length; i++) {

      const addressObj = resource.addresses[i]

      let label = 'Other'

      if ( addressObj?.type?.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( addressObj?.type?.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( addressObj?.type?.toLowerCase() === 'investment property' ) {
        label = 'Investment Property'
      }
        

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

      if (addressObj.state) {
        attributes.push({
          attribute_type: 'state',
          text: addressObj.state,
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
    for (let i = 0; i < resource.emailes.length; i++) {

      const emailObj = resource.emailes[i]

      let label = 'Other'

      if ( emailObj?.type?.toLowerCase() === 'personal' ) {
        label = 'Personal'
      }

      if ( emailObj?.type?.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if (emailObj.value) {
        attributes.push({
          attribute_type: 'email',
          text: emailObj.value,
          label: label,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  if (key === 'phones') {
    for (let i = 0; i < resource.phones.length; i++) {

      const phoneObj = resource.phones[i]

      let label = 'Other'

      if ( phoneObj?.type?.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( phoneObj?.type?.toLowerCase() === 'mobile' ) {
        label = 'Mobile'
      }

      if ( phoneObj?.type?.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( phoneObj?.type?.toLowerCase() === 'fax' ) {
        label = 'Fax'
      }

      if ( phoneObj?.type?.toLowerCase() === 'whatsApp' ) {
        label = 'WhatsApp'
      }

      if (phoneObj.value) {
        attributes.push({
          attribute_type: 'phone_number',
          text: phoneObj.value,
          label: label,
          is_primary: i === 0 ? true : false
        })
      }
    }
  }

  return attributes
}

const findNewAttributes = (resource, oldResource, oldAttributes, contactGroups) => {
  const refinedAtts = groupBy(oldAttributes, function(entry) { return entry.attribute_type})

  /** @type {IContactAttributeInput[]} */
  const attributes = []

  // Singular Attributes
  if ( resource?.names?.givenName !== oldResource?.names?.givenName ) {
    const firstNameAtt = refinedAtts?.first_name?.length ? refinedAtts.first_name[0] : null

    if (firstNameAtt) {
      attributes.push({ id: firstNameAtt.id, attribute_type: 'first_name', text: resource?.names?.givenName || '' })
    } else {
      attributes.push({ attribute_type: 'first_name', text: resource?.names?.givenName || '' })
    }
  }

  if ( resource?.names?.familyName !== oldResource?.names?.familyName ) {
    const lastNameAtt = refinedAtts?.last_name?.length ? refinedAtts.last_name[0] : null

    if (lastNameAtt) {
      attributes.push({ id: lastNameAtt.id, attribute_type: 'last_name', text: resource?.names?.familyName || '' })
    } else {
      attributes.push({ attribute_type: 'last_name', text: resource?.names?.familyName || '' })
    }
  }

  if ( resource?.names?.middleName !== oldResource?.names?.middleName ) {
    const middleNameAtt = refinedAtts?.middle_name?.length ? refinedAtts.middle_name[0] : null

    if (middleNameAtt) {
      attributes.push({ id: middleNameAtt.id, attribute_type: 'middle_name', text: resource?.names?.middleName || '' })
    } else {
      attributes.push({ attribute_type: 'middle_name', text: resource?.names?.middleName || '' })
    }
  }

  if ( resource.nickName !== oldResource?.nickName ) {
    const nickNameAtt = refinedAtts?.nickname?.length ? refinedAtts.nickname[0] : null

    if (nickNameAtt) {
      attributes.push({ id: nickNameAtt.id, attribute_type: 'nickname', text: resource.nickName || '' })
    } else {
      attributes.push({ attribute_type: 'nickname', text: resource.nickName || '' })
    }
  }


  if ( resource?.organization?.jobTitle !== oldResource?.organization?.jobTitle ) {
    const jobTitleAtt = refinedAtts?.job_title?.length ? refinedAtts.job_title[0] : null
    
    if (jobTitleAtt) {
      attributes.push({ id: jobTitleAtt.id, attribute_type: 'job_title', text: resource?.organization?.jobTitle || '' })
    } else {
      attributes.push({ attribute_type: 'job_title', text: resource?.organization?.jobTitle || '' })
    }
  }

  if ( resource?.organization?.company !== oldResource?.organization?.company ) {
    const companyAtt = refinedAtts?.company?.length ? refinedAtts.company[0] : null

    if (companyAtt) {
      attributes.push({ id: companyAtt.id, attribute_type: 'company', text: resource?.organization?.company || '' })
    } else {
      attributes.push({ attribute_type: 'company', text: resource?.organization?.company || '' })
    }
  }

  if ( resource.website !== oldResource?.website ) {
    const websiteAtt = refinedAtts?.website?.length ? refinedAtts.website[0] : null

    if (websiteAtt) {
      attributes.push({ id: websiteAtt.id, attribute_type: 'website', text: resource.website || '' })
    } else {
      attributes.push({ attribute_type: 'website', text: resource.website || '' })
    }
  }

  if ( resource.birthday !== oldResource?.birthday ) {
    const birthdayAtt = refinedAtts?.birthday?.length ? refinedAtts.birthday[0] : null

    const temp     = new Date(resource.birthday)
    const tzOffset = temp.getTimezoneOffset() * 60000
    const birthday = new Date(temp.getTime() - tzOffset)

    if (birthdayAtt) {
      attributes.push({ id: birthdayAtt.id, attribute_type: 'birthday', date: resource.birthday ? (birthday.getTime() / 1000) : 0 })
    } else {
      attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
    }
  }

  if ( oldResource?.memberships && !isEqual(resource.memberships, oldResource.memberships) ) {
    const currentTags = []

    for ( const membership of oldResource.memberships ) {
      const gname = membership.contactGroupResourceName

      if (gname && contactGroups[gname]) {
        currentTags.push(contactGroups[gname])
      }
    }

    if (resource.memberships) {
      for ( const membership of resource.memberships ) {
        const gname = membership.contactGroupResourceName

        if ( gname && contactGroups[gname] && !currentTags.includes(contactGroups[gname]) ) {
          attributes.push({ attribute_type: 'tag', text: contactGroups[gname] })
        }
      }
    }
  }


  // None Singulr Attributes
  if ( resource.note !== oldResource?.note ) {
    if (resource.note) {
      attributes.push({ attribute_type: 'note', text: resource.note })
    }
  }


  const oldPhoneNumbers = refinedAtts.phone_number ? (refinedAtts.phone_number.map(entry => entry.text)) : []

  for ( const phone of resource.phones ) {
    if ( !oldPhoneNumbers.includes(phone.value) ) {

      let label = 'Other'

      if ( phone?.type?.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( phone?.type?.toLowerCase() === 'mobile' ) {
        label = 'Mobile'
      }

      if ( phone?.type?.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( phone?.type?.toLowerCase() === 'fax' ) {
        label = 'Fax'
      }

      if ( phone?.type?.toLowerCase() === 'whatsApp' ) {
        label = 'WhatsApp'
      }

      attributes.push({
        attribute_type: 'phone_number',
        text: phone.value,
        label: label,
        is_primary: false
      })
    }
  }


  const oldEmails = refinedAtts.email ? (refinedAtts.email.map(entry => entry.text)) : []

  for ( const email of resource.emailes ) {
    if ( !oldEmails.includes(email.value) ) {

      let label = 'Other'

      if ( email?.type?.toLowerCase() === 'personal' ) {
        label = 'Personal'
      }

      if ( email?.type?.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      attributes.push({
        attribute_type: 'email',
        text: email.value,
        label: label,
        is_primary: false
      })
    }
  }


  if ( oldResource && resource.addresses.length ) {

    let maxIndex     = 1
    const addressArr = [...refinedAtts.postal_code || [], ...refinedAtts.street_name || [], ...refinedAtts.city || [], ...refinedAtts.country || []]
  
    for ( const entry of addressArr ) {
      if ( Number(entry.index) > maxIndex ) {
        maxIndex = Number(entry.index)
      }
    }
  
    let addressesArr = []
  
    if ( oldResource.addresses.length === 0 ) {
      addressesArr = resource.addresses

    } else {

      for ( const address of resource.addresses ) {
        let flag = true

        for ( const oldAddress of oldResource.addresses ) {
          if ( isEqual(address, oldAddress) ) {
            flag = false
          }
        }

        if (flag) {
          addressesArr.push(address)
        }
      }
    }

    for ( const address of addressesArr ) {
      maxIndex ++

      let label = 'Other'

      if ( address?.type?.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( address?.type?.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( address?.type?.toLowerCase() === 'investment property' ) {
        label = 'Investment Property'
      }

      if (address.streetAddress) {
        attributes.push({
          attribute_type: 'street_name',
          text: address.streetAddress,
          label: label,
          index: maxIndex,
          is_primary: false
        })
      }
    
      if (address.city) {
        attributes.push({
          attribute_type: 'city',
          text: address.city,
          label: label,
          index: maxIndex,
          is_primary: false
        })
      }
    
      if (address.country) {
        attributes.push({
          attribute_type: 'country',
          text: address.country,
          label: label,
          index: maxIndex,
          is_primary: false
        })
      }
    
      if (address.postalCode) {
        attributes.push({
          attribute_type: 'postal_code',
          text: address.postalCode,
          label: label,
          index: maxIndex,
          is_primary: false
        })
      }
    }
  }

  return attributes
}

const generateGContacts = (credential, contacts) => {
  return contacts.map(contact => {
    const clientData = [{
      key: `rechatCredential:${credential}`,
      value: `rechatContact:${contact.id}`
    }]

    const names = [{
      givenName: contact.first_name, //`specialxx-${contact.first_name}`,
      familyName: contact.last_name,
      middleName: contact.middle_name
    }]

    const nicknames = [{ value: contact.nickname }]

    let birthdays = []

    if (contact.birthday) {
      const birthday     = new Date(contact.birthday)
      const birthdayObj  = { year: birthday.getFullYear(), month: birthday.getMonth() + 1, day: birthday.getDate() }
      const birthdayText = `${birthdayObj.month}/${birthdayObj.day}/${birthdayObj.year}`
      
      birthdays = [{
        date: birthdayObj,
        text: birthdayText
      }]
    }

    const urls = contact.attributes.filter(a => a.attribute_type === 'website' ).map(a => {
      return {
        value: a.text
      }
    })

    let addresses = []

    if ( contact.address ) {
      addresses = contact.address.map(a => {
        return {
          type: a.extra,
          streetAddress: a.line1,
          city: a.city,
          postalCode: a.postcode,
          country: a.country || 'US',
          countryCode: a.country || 'US'
        }
      })
    }

    const emailAddresses = contact.attributes.filter(a => a.attribute_type === 'email' ).map(a => {
      return {
        type: a.label,
        value: a.text
      }
    })

    const phoneNumbers = contact.attributes.filter(a => a.attribute_type === 'phone_number' ).map(a => {
      return {
        type: a.label,
        value: a.text
      }
    })

    // Cannot have more than one person.biographies per source
    let biographies = []

    const primaryBiographies = contact.attributes.filter(a => a.attribute_type === 'note' && a.is_primary ).map(a => {
      return {
        contentType: 'TEXT_HTML',
        value: a.text
      }
    })

    const ordinaryBiographies = contact.attributes.filter(a => a.attribute_type === 'note' && !a.is_primary ).map(a => {
      return {
        contentType: 'TEXT_HTML',
        value: a.text
      }
    })

    if ( primaryBiographies.length ) {
      biographies = [primaryBiographies[0]]
    } else {
      biographies = [ordinaryBiographies[0]]
    }

    const organizations = [{ name: contact.company, title: contact.job_title }]

    return {
      contact: contact.id,

      resource: {
        clientData,
        names,
        nicknames,
        birthdays,
        urls,
        addresses,
        emailAddresses,
        phoneNumbers,
        biographies,
        organizations
      }
    }
  })
}


module.exports = {
  parseAttributes,
  findNewAttributes,
  generateGContacts
}