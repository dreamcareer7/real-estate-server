const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftContact = require('../../contact')
const Contact          = require('../../../Contact/index')

const { extractContactsProjection } = require('./static')


const fetchMessages = async function (microsoft, lastSyncAt, projection, fullSync = false) {
  const max = config.microsoft_sync.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.microsoft_sync.backward_month_num)

  let messages = []

  const filter_1 = lastSyncAt ? (`&$filter=isDraft eq false and createdDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const filter_2 = lastSyncAt ? (`&$filter=isDraft eq false and lastModifiedDateTime ge ${new Date(lastSyncAt).toISOString()}`) : '&$filter=isDraft eq false'
  const select   = projection ? (`&$select=${projection}`) : ''
  const expand   = `&$expand=attachments($select=id,name,contentType,size,isInline),extensions($filter=id eq '${config.microsoft_integration.openExtension.outlook.name}')`

  let query = `${filter_1}${select}`

  if (fullSync)
    query = `${filter_2}${select}${expand}`

  const url = `https://graph.microsoft.com/v1.0/me/messages?$top=250${query}`

  for await (const response of microsoft.discreteGetMessagessNative(url)) {
    if ( !response.value || response.value.length === 0 )
      break

    const fetchedMessages = response.value
    messages = messages.concat(fetchedMessages)

    const currentMsgModifiedDateTime = new Date(fetchedMessages[fetchedMessages.length - 1]['lastModifiedDateTime'])
    const currentMsgModifiedDateTS   = Number(currentMsgModifiedDateTime.getTime())

    const currentMsgCreatedDateTime  = new Date(fetchedMessages[fetchedMessages.length - 1]['createdDateTime'])
    const currentMsgCreatedDateTS    = Number(currentMsgCreatedDateTime.getTime())

    const toCheckTS = fullSync ? currentMsgModifiedDateTS : currentMsgCreatedDateTS

    Context.log('SyncOutlookMessages - fetchMessages - messages.length:', messages.length)

    if( messages.length >= max || toCheckTS <= UTS )
      break
  }

  return messages
}

const parseAttributes = (key, data) => {
  /** @type {IContactAttributeInput[]} */
  const attributes = []

  if ( key === 'title' ) {
    if (data.title) {
      attributes.push({
        attribute_type: 'title',
        text: data.title
      })
    }
  }

  if (key === 'emailAddresses') {
    for (let i = 0; i < data.emailAddresses.length; i++) {
      attributes.push({
        attribute_type: 'email',
        text: data.emailAddresses[i]['address'],
        label: 'Other',
        is_primary: i === 0 ? true : false
      })
    }
  }

  return attributes
}

const extractContacts = async (microsoft, credential, lastSyncAt) => {
  const currentEmail = credential.email
  const credentialId = credential.id
  const user         = credential.user
  const brand        = credential.brand

  const records     = []
  const newContacts = []

  const projection  = extractContactsProjection.join(',')
  const targetKeys  = ['title', 'emailAddresses']
  
  let createdNum = 0

  try {

    const messages = await fetchMessages(microsoft, lastSyncAt, projection)

    Context.log('SyncOutlookMessages - extractContacts 1', credential.email)

    if ( messages.length ) {

      const recipients    = []
      const recipientsSet = new Set()

      const oldMicrosoftContactEmailSet = await MicrosoftContact.getMCredentialContactsAddress(credentialId)

      for ( const message of messages ) {
        // Unknown bug by outlook, Its not clear why from and sender could be null!!
        // https://kb.intermedia.net/article/21942
        if( !message.from && !message.sender )
          continue

        const fromAddress   = message.from.emailAddress ? message.from.emailAddress.address : null
        const senderAddress = message.sender.emailAddress ? message.sender.emailAddress.address : null

        if ( fromAddress !== currentEmail && senderAddress !== currentEmail )
          continue

        let recipientsArr = []

        recipientsArr = recipientsArr.concat(message.toRecipients)
        recipientsArr = recipientsArr.concat(message.ccRecipients)
        recipientsArr = recipientsArr.concat(message.bccRecipients)

        for (const entry of recipientsArr) {
          if ( !recipientsSet.has(entry.emailAddress.address) && !oldMicrosoftContactEmailSet.has(entry.emailAddress.address) )
            recipients.push(entry.emailAddress)

          recipientsSet.add(entry.emailAddress.address)
        }
      }

      // insert new contacts (check duplicate)
      for (const recipient of recipients) {
        const data = {
          title: recipient.name,
          emailAddresses: [recipient]
        }

        if (recipient.address) {
          records.push({
            microsoft_credential: credentialId,
            remote_id: recipient.address,
            data: JSON.stringify(data),
            source: 'sentBox'
          })
        }
      }

      const createdMicrosoftContacts = await MicrosoftContact.create(records)

      for (const createdMicrosoftContact of createdMicrosoftContacts) {
  
        /** @type {IContactInput} */
        const contact = {
          user: user,
          microsoft_id: createdMicrosoftContact.id,
          attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }]
        }

        for (const key in createdMicrosoftContact.data) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes = parseAttributes(key, createdMicrosoftContact.data)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }

        newContacts.push(contact)
      }

      if (newContacts.length)
        await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      createdNum = createdMicrosoftContacts.length
    }

    Context.log('SyncOutlookMessages - extractContacts 2', credential.email)

    const totalContactsNum = await MicrosoftContact.getMCredentialContactsNum(credentialId, ['sentBox', 'contacts'])

    Context.log('SyncOutlookMessages - extractContacts 3', credential.email)

    return  {
      status: true,
      createdNum,
      totalNum: totalContactsNum[0]['count']
    }

  } catch (ex) {

    Context.log(`SyncOutlookMessages - extractContacts - catch ex => Email: ${credential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 || ex.message === 'Error: read ECONNRESET' ) {
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