const db  = require('../../../utils/db')
const Orm = require('../../Orm')
const Email = require('../../Email')

const EmailCampaignRecipient = {}
global['EmailCampaignRecipient'] = EmailCampaignRecipient

EmailCampaignRecipient.getAll = async ids => {
  return await db.select('email/campaign/recipient/get', [ids])
}

EmailCampaignRecipient.insertForCampaigns = async (/** @type {IEmailCampaignInput[]} */campaigns) => {
  const recipients = []

  for(const campaign of campaigns) {
    const {
      to  = [],
      cc  = [],
      bcc = []
    } = campaign

    for(const recipient of to) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        brand: /**   @type {IEmailRecipientBrandInput} */ (recipient).brand,
        agent: /**   @type {IEmailRecipientAgentInput} */ (recipient).agent,
        send_type: Email.TO,
        recipient_type: (recipient).recipient_type
      })
    }

    for(const recipient of cc) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        brand: /**   @type {IEmailRecipientBrandInput} */ (recipient).brand,
        agent: /**   @type {IEmailRecipientAgentInput} */ (recipient).agent,
        send_type: Email.CC,
        recipient_type: (recipient).recipient_type
      })
    }

    for(const recipient of bcc) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        brand: /**   @type {IEmailRecipientBrandInput} */ (recipient).brand,
        agent: /**   @type {IEmailRecipientAgentInput} */ (recipient).agent,
        send_type: Email.BCC,
        recipient_type: (recipient).recipient_type
      })
    }

    // const viaMicrosoft = Boolean(campaign.microsoft_credential) 
    // const viaGoogle    = Boolean(campaign.google_credential)

    const recipientsNum = recipients.length

    // if (viaMicrosoft) {
    //   if ( recipientsNum > 500 )
    //     throw Error.BadRequest('Recipients number should not be greater than 500.')
    // }
  
    // if (viaGoogle) {
    //   if ( recipientsNum > 100 )
    //     throw Error.BadRequest('Recipients number should not be greater than 100.')
    // }


    if ( !campaign.individual ) {
      if ( recipientsNum > 1000 ) {
        throw Error.BadRequest('Recipients number should not be greater than 1000 in normal campaigns.')
      }
    }
  }

  await db.query.promise('email/campaign/recipient/insert', [JSON.stringify(recipients)])
}

EmailCampaignRecipient.associations = {
  list: {
    model: 'ContactList',
    optional: true,
    enabled: false
  },

  contact: {
    model: 'Contact',
    optional: true,
    enabled: false
  },

  brand: {
    model: 'Brand',
    optional: true,
    enabled: false
  },

  agent: {
    model: 'Agent',
    optional: true,
    enabled: false
  }
}

Orm.register('email_campaign_recipient', 'EmailCampaignRecipient', EmailCampaignRecipient)

module.exports = EmailCampaignRecipient
