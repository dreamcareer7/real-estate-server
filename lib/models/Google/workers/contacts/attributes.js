const _ = require('lodash')


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
      const arr = resource.birthday.split('/') // sample: 10/15/1980

      if ( arr.length === 3 ) {
        const birthday = new Date(arr[1], arr[0] - 1, arr[2], 0, 0, 0)

        attributes.push({
          attribute_type: 'birthday',
          date: birthday.getTime() / 1000
        })
      }
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

  if (key === 'groupMembership') {
    if (resource.memberships) {
      for ( const membership of resource.memberships ) {
        const gname = membership?.contactGroupResourceName

        if ( gname && contactGroups.gname ) {
          attributes.push({ attribute_type: 'tag', text: contactGroups.gname })  
        }
      }
    }
  }

  if (key === 'addresses') {
    for (let i = 0; i < resource.addresses.length; i++) {

      const addressObj = resource.addresses[i]

      let label = 'Other'

      if ( addressObj?.type.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( addressObj?.type.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( addressObj?.type.toLowerCase() === 'investment property' ) {
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

      if ( emailObj?.type.toLowerCase() === 'personal' ) {
        label = 'Personal'
      }

      if ( emailObj?.type.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if (emailObj.address) {
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

      if ( phoneObj?.type.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( phoneObj?.type.toLowerCase() === 'mobile' ) {
        label = 'Mobile'
      }

      if ( phoneObj?.type.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( phoneObj?.type.toLowerCase() === 'fax' ) {
        label = 'Fax'
      }

      if ( phoneObj?.type.toLowerCase() === 'whatsApp' ) {
        label = 'WhatsApp'
      }

      if (phoneObj.phoneNumber) {
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

const findNewAttributes = (contact, oldAttributes) => {
  const rawData     = contact.rawData
  const oldRawData  = contact.oldRawData
  const refinedAtts = _.groupBy(oldAttributes, function(entry) { return entry.attribute_type})

  /** @type {IContactAttributeInput[]} */
  const attributes = []


  // Singular Attributes
  if ( rawData?.names?.givenName !== oldRawData?.names?.givenName ) {
    const firstNameAtt = refinedAtts.first_name ? (refinedAtts.first_name.length ? refinedAtts.first_name[0].text : null) : null

    if (rawData.names.givenName && !firstNameAtt) {
      attributes.push({ attribute_type: 'first_name', text: rawData.names.givenName })
    }
  }

  if ( rawData?.names?.familyName !== oldRawData?.names?.familyName ) {
    const lastNameAtt = refinedAtts.last_name ? (refinedAtts.last_name.length ? refinedAtts.last_name[0].text : null) : null

    if (rawData.names.familyName && !lastNameAtt) {
      attributes.push({ attribute_type: 'last_name', text: rawData.names.familyName })
    }
  }

  if ( rawData?.names?.middleName !== oldRawData?.names?.middleName ) {
    const middleNameAtt = refinedAtts.middle_name ? (refinedAtts.middle_name.length ? refinedAtts.middle_name[0].text : null) : null

    if (rawData.names.middleName && !middleNameAtt) {
      attributes.push({ attribute_type: 'middle_name', text: rawData.names.middleName })
    }
  }

  if ( rawData.nickName !== oldRawData.nickName ) {
    const nickNameAtt = refinedAtts.nickname ? (refinedAtts.nickname.length ? refinedAtts.nickname[0].text : null) : null

    if (rawData.nickName && !nickNameAtt) {
      attributes.push({ attribute_type: 'nickname', text: rawData.nickName })
    }
  }


  if ( rawData?.organization?.jobTitle !== oldRawData?.organization?.jobTitle ) {
    const jobTitleAtt = refinedAtts.job_title ? (refinedAtts.job_title.length ? refinedAtts.job_title[0].text : null) : null

    if (rawData.organization.jobTitle && !jobTitleAtt) {
      attributes.push({ attribute_type: 'job_title', text: rawData.organization.jobTitle })
    }
  }

  if ( rawData?.organization?.company !== oldRawData?.organization?.company ) {
    const companyAtt = refinedAtts.company ? (refinedAtts.company.length ? refinedAtts.company[0].text : null) : null

    if (rawData.organization.company && !companyAtt) {
      attributes.push({ attribute_type: 'company', text: rawData.organization.company })
    }
  }


  if ( rawData.birthday !== oldRawData.birthday ) {
    const birthdayAtt = refinedAtts.birthday ? (refinedAtts.birthday.length ? refinedAtts.birthday[0].date : null) : null

    if (rawData.birthday && !birthdayAtt) {
      const birthday = new Date(rawData.birthday)
      attributes.push({ attribute_type: 'birthday', date: birthday.getTime() / 1000 })
    }
  }

  if ( rawData.website !== oldRawData.website ) {
    const websiteeAtt = refinedAtts.website ? (refinedAtts.website.length ? refinedAtts.website[0].text : null) : null

    if (rawData.website && !websiteeAtt) {
      attributes.push({ attribute_type: 'website', text: rawData.website })
    }
  }



  // None Singulr Attributes
  if ( rawData.note !== oldRawData.note ) {
    if (rawData.note) {
      attributes.push({ attribute_type: 'note', text: rawData.note })
    }
  }


  const oldPhoneNumbers = refinedAtts.phone_number ? (refinedAtts.phone_number.map(entry => entry.text)) : []

  for ( const phone of rawData.phones ) {
    if ( !oldPhoneNumbers.includes(phone.phoneNumber) ) {

      let label = 'Other'

      if ( phone?.type.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( phone?.type.toLowerCase() === 'mobile' ) {
        label = 'Mobile'
      }

      if ( phone?.type.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( phone?.type.toLowerCase() === 'fax' ) {
        label = 'Fax'
      }

      if ( phone?.type.toLowerCase() === 'whatsApp' ) {
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

  for ( const email of rawData.emailes ) {
    if ( !oldEmails.includes(email.address) ) {

      let label = 'Other'

      if ( email?.type.toLowerCase() === 'personal' ) {
        label = 'Personal'
      }

      if ( email?.type.toLowerCase() === 'work' ) {
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


  if ( rawData.addresses.length ) {

    let maxIndex     = 1
    const addressArr = [...refinedAtts.postal_code || [], ...refinedAtts.street_name || [], ...refinedAtts.city || [], ...refinedAtts.country || []]
  
    for ( const entry of addressArr ) {
      if ( Number(entry.index) > maxIndex ) {
        maxIndex = Number(entry.index)
      }
    }
  
    let addressesArr = []
  
    if ( oldRawData.addresses.length === 0 ) {
      addressesArr = rawData.addresses

    } else {

      for ( const address of rawData.addresses ) {
        let flag = true

        for ( const oldAddress of oldRawData.addresses ) {
          if ( _.isEqual(address, oldAddress) ) {
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

      if ( address?.type.toLowerCase() === 'home' ) {
        label = 'Home'
      }

      if ( address?.type.toLowerCase() === 'work' ) {
        label = 'Work'
      }

      if ( address?.type.toLowerCase() === 'investment property' ) {
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


module.exports = {
  parseAttributes,
  findNewAttributes
}