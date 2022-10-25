const config  = require('../../../../config')
const Contact = require('../../../Contact')
const Context = require('../../../Context')
// const Context   = require('../../../Context')
// const parseName = require('parse-full-name').parseFullName

const { extractContactsProjection } = require('./static')
const projection = extractContactsProjection.join(',')
const targetKeys = ['title', 'name', 'emailAddresses']


const fetchSentMessages = async function (microsoft, lastSyncAt, projection) {
  const max = config.microsoft_integration.max_parse_sent_emails_num

  let messages = []

  const filter = lastSyncAt ? (`&$filter=createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : ''
  const select = projection ? (`&$select=${projection}`) : ''

  const query = `${filter}${select}`

  const url = `https://graph.microsoft.com/v1.0/me/MailFolders/sentitems/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 ) {
      break
    }

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    if( messages.length >= max ) {
      break
    }
  }

  return messages
}

const parseAttributes = (key, data) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  // if ( key === 'name' ) {
  //   const name = parseName(data.name)

  //   if (name.first && !name.first.includes('@')) {
  //     attributes.push({
  //       attribute_type: 'first_name',
  //       text: name.first.toLowerCase()
  //     })
  //   }

  //   if (name.last && !name.last.includes('@')) {
  //     attributes.push({
  //       attribute_type: 'last_name',
  //       text: name.last.toLowerCase()
  //     })
  //   }
  // }

  if (key === 'emailAddresses') {
    for (let i = 0; i < data.emailAddresses.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: (data.emailAddresses[i]['address']).toLowerCase(),
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  return attributes
}

const processMessages = async (credential, messages) => {
  const userEmail = credential.email
  const user      = credential.user

  const recipients    = []
  const recipientsSet = new Set()
  
  for ( const message of messages ) {
    // Unknown bug by outlook, Its not clear why from and sender could be null!!
    // https://kb.intermedia.net/article/21942
    if( !message.from && !message.sender ) {
      continue
    }

    const fromAddress   = message.from.emailAddress ? message.from.emailAddress.address : null
    const senderAddress = message.sender.emailAddress ? message.sender.emailAddress.address : null

    if ( fromAddress.toLowerCase() !== userEmail.toLowerCase() && senderAddress.toLowerCase() !== userEmail.toLowerCase() ) {
      continue
    }
    
    let recipientsArr = []
    recipientsArr = recipientsArr.concat(message.toRecipients)
    recipientsArr = recipientsArr.concat(message.ccRecipients)
    recipientsArr = recipientsArr.concat(message.bccRecipients)


    for (const entry of recipientsArr) {
      if ( !recipientsSet.has(entry.emailAddress.address) ) {
        recipients.push(entry.emailAddress)
      }
      recipientsSet.add(entry.emailAddress.address)
    }
  }

  const validRecipients = recipients.filter(r => r.address)

  return validRecipients.map(recipient => {
    /** @type {IContactInput} */
    const contactObj = {
      user: user,
      attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }],
      parked: true
    }

    const data = {
      name: recipient.name,
      emailAddresses: [recipient]
    }

    for (const key in data) {
      if (targetKeys.indexOf(key) >= 0) {
        const attributes      = parseAttributes(key, data)
        contactObj.attributes = contactObj.attributes.concat(attributes)
      }
    }

    return contactObj
  })
}

const chunkHandler = async (user, brand, temp) => {
  // Check DB to exclude duplicate contacts.
  // If it is a new contact/email-address, push it into pruned

  let emails = temp
    .map(c => {
      return c.attributes.filter(att => att.attribute_type === 'email' ).map(att => att.text)
    })
    .flat()

  let {ids}     = await Contact.fastFilter(brand, user, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
  let result    = await Contact.getAll(ids)
  let duplicate = result.map(c => c.emails).flat()

  // free memory
  emails = []
  ids    = []
  result = []

  let pruned = temp
    .map(c => {
      c.attributes = c.attributes
        .filter(att => 
          ( att.attribute_type !== 'email' ) ||
          ( att.attribute_type === 'email' && !duplicate.includes(att.text.toLowerCase()) )
        )
      return c
    })
    .filter(c => c.attributes.length > 1) // Because there should be at lest one email-address. attributes will always contains source_type att.
    .flat()

  const createdContactIds = await Contact.create(pruned, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

  // reset pruned
  pruned    = []
  duplicate = []

  return createdContactIds.length
}

const pruneAndPersist = async (contacts, user, brand) => {
  /*
    const contacts = {
      user: user,
      attributes: [
        { attribute_type: 'source_type', text: 'Microsoft' },
        { attribute_type: 'email', text: 'email-address' }
      ],
      parked: true
    }
  */

  const limit  = 50
  const length = contacts.length

  let createdNum = 0
  let temp = []

  for ( let i = 0; i < length; i ++ ) {
    if ( temp.length < limit ) {
      temp.push(contacts[i])
      continue
    }

    if ( temp.length === limit ) {
      const num = await chunkHandler(user, brand, temp)
      createdNum += num

      // reset temp
      temp = []
    }
  }

  if ( temp.length > 0 ) {
    const num = await chunkHandler(user, brand, temp)
    createdNum += num

    // reset temp
    temp = []
  }
 
  return createdNum
}

const extractContacts = async (microsoft, credential, lastSyncAt) => {
  const user  = credential.user
  const brand = credential.brand

  try {
    const messages = await fetchSentMessages(microsoft, lastSyncAt, projection)
    Context.log('SyncMicrosoftContacts - Fetch sent messages length:', messages.length)
    if ( messages.length === 0 ) {
      return  {
        status: true,
        createdNum: 0
      }
    }

    const newContacts = await processMessages(credential, messages)
    const createdNum  = await pruneAndPersist(newContacts, user, brand)
    Context.log(`SyncMicrosoftContacts - createdNum:${createdNum}`)
    return  {
      status: true,
      createdNum
    }

  } catch (ex) {

    const fiveXErr = [500, 501, 502, 503, 504]
    if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {    
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  extractContacts
}
