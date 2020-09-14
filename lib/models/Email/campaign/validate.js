const expect = require('../../../utils/validator').expect

const MicrosoftCredential = require('../../Microsoft/credential')
const GoogleCredential = require('../../Google/credential')

const { validateAttachmentsSize } = require('./attachment/validate')

const validateCredential = async (campaign, viaMicrosoft, viaGoogle) => {
  if ( !viaMicrosoft && !viaMicrosoft ) {
    return
  }

  let credential

  if (viaMicrosoft) {
    credential = await MicrosoftCredential.hasSendEmailAccess(campaign.microsoft_credential)
  }

  if (viaGoogle) {
    credential = await GoogleCredential.hasSendEmailAccess(campaign.google_credential)
  }

  if (credential && (credential.user !== campaign.from)) {
    throw Error.Validation('Sender is not allowed to send email on behalf of the connected account!')  
  }

  // Disabled due to issue: https://gitlab.com/rechat/server/-/issues/1576
  // if ( credential && credential.user !== campaign.from ) {
  //   throw Error.Validation('Invalid user!')
  // }

  if ( credential &&  credential.revoked ) {
    throw Error.Validation('Credential is revoked!')
  }

  if ( credential &&  credential.deleted_at ) {
    throw Error.Validation('Credential is deleted!')
  }
}

const validate = async campaign => {
  if ( campaign.google_credential && campaign.microsoft_credential ) {
    throw Error.Validation('It is not allowed to send both google and microsoft ceredentials.')
  }

  const viaMicrosoft = Boolean(campaign.microsoft_credential) 
  const viaGoogle    = Boolean(campaign.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  await validateCredential(campaign, viaMicrosoft, viaGoogle)
  validateAttachments(campaign, viaMailgun)

  if (viaMailgun) {
    campaign.headers = {}
  }
}

const validateAttachments = (campaign, viaMailgun) => {
  if (!campaign.attachments) {
    return
  }

  for (const attachment of campaign.attachments) {
    expect(Boolean(!attachment.file) && Boolean(!attachment.url), 'Attachment\'s file or url is missed!').to.equal(false)
    expect(Boolean(attachment.file) && Boolean(attachment.url), 'It is not allowed to send both attachments\'s file and url').to.equal(false)

    if ( !attachment.file && attachment.url ) {
      if (!attachment.name) {
        throw Error.Validation('Attachment\'s name is missed!')
      }
    }

    if (viaMailgun) {
      return
    }

    if (!attachment.is_inline) {
      return
    }

    if (!attachment.content_id) {
      throw Error.Validation('Attachment\'s content-id is missed!')
    }

    return
  }
}

module.exports = {
  validate,
  validateAttachmentsSize,
}
