const mimelib = require('mimelib')

const Contact       = require('../../../Contact/index')
const GoogleMessage = require('../../message')



const fetchMessages = async function (google) {
  const max = 100
  const UTS = new Date().setDate(new Date().getDate() - 10); // setFullYear, getFullYear

  let checkingDate = new Date().getTime()
  let messages     = []
  let rawMessages  = []

  for await (const response of google.discreteSyncMessages()) {    
    if(!response.data.messages)
      break
    
    const batchRawResult = await google.batchGetMessages(response.data.messages)
    
    checkingDate = parseInt(batchRawResult[batchRawResult.length - 1]['internalDate'])
    messages     = messages.concat(response.data.messages)
    rawMessages  = rawMessages.concat(batchRawResult)

    if( messages.length >= max || checkingDate <= UTS )
      break
  }

  return rawMessages
}

const parseAttributes = function (headers) {
  const attributes = []

  const parser = function(addresses) {
    for (const addresse of addresses) {
      attributes.push({
        attribute_type: 'first_name',
        text: addresse.name
      })
  
      // attributes.push({
      //   attribute_type: 'last_name',
      //   text: ''
      // })
  
      attributes.push({
        attribute_type: 'email',
        text: addresse.address,
        label: 'Other',
        is_primary: true
      })
    }
  }

  if(headers.to)
    parser(headers.to.addresses)

  if(headers.bcc)
    parser(headers.bcc.addresses)

  if(headers.cc)
    parser(headers.cc.addresses)

  return attributes
}

const syncMessages = async (google, data) => {
  const currentEmail  = data.googleCredential.email
  const credentialId  = data.googleCredential.id
  const user          = data.googleCredential.user
  const brand         = data.googleCredential.brand

  const newContacts     = []
  const refinedMessages = []

  try {
  
    const rawMessages = await fetchMessages(google)

    for await ( const rawMessage of rawMessages ) {
      const refinedMessage = {
        google_credential: credentialId,
        message_id: rawMessage.id,
        thread_id: rawMessage.threadId,
        history_id: rawMessage.historyId,
        snippet: rawMessage.snippet,
        label_ids: JSON.stringify(rawMessage.labelIds),
        internal_date: parseInt(rawMessage.internalDate / 1000),
        size_estimate: parseInt(rawMessage.sizeEstimate),
        out_bound: false,
        headers: {}
      }

      const targetHeaders_1 = ['from', 'to', 'bcc', 'cc']
      const targetHeaders_2 = ['subject', 'date']

      for ( const header of rawMessage.payload.headers ) {

        if ( targetHeaders_1.includes(header.name.toLowerCase()) ) {
          const addresses = mimelib.parseAddresses(header.value)
          const emails    = addresses.map(a => a.address)

          refinedMessage.headers[header.name.toLowerCase()] = {
            value: header.value,
            addresses: addresses
          }

          if ( header.name.toLowerCase() === 'from' ) {
            if ( emails.includes(currentEmail) )
              refinedMessage.out_bound = true
          }
        }

        if ( targetHeaders_2.includes(header.name.toLowerCase()) )
          refinedMessage.headers[header.name.toLowerCase()] = header.value
      }

      refinedMessage.headers = JSON.stringify(refinedMessage.headers)

      refinedMessages.push(refinedMessage)
    }

    const createdGoogleMessages = await GoogleMessage.create(refinedMessages)
    

    // insert new contacts (check duplicate)
    for (const createdGoogleMessage of createdGoogleMessages) {
      if ( !createdGoogleMessage.out_bound )
        continue


      /** @type {IContactInput} */
      const contact = {
        user: user,
        google_id: createdGoogleMessage.id,
        attributes: [{ attribute_type: 'source_type', text: 'Google' }]

        // google_id: null,
        // attributes: [{ attribute_type: 'source_type', text: 'Google_Message' }]
      }

      const attributes   = parseAttributes(createdGoogleMessage.headers)
      contact.attributes = contact.attributes.concat(attributes)

      if ( contact.attributes.length > 1 )
        newContacts.push(contact)
    }

    if (newContacts.length)
      await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

    return  {
      status: true
    }

  } catch (ex) {

    return  {
      syncToken: null,
      status: false,
      ex: ex
    }
  }
}

module.exports = {
  syncMessages
}