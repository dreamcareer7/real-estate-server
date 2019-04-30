const db = require('../../../utils/db')
const Orm = require('../../Orm')
const Email = require('../../Email')

const EmailCampaignRecipient = {}
global['EmailCampaignRecipient'] = EmailCampaignRecipient

EmailCampaignRecipient.getAll = async ids => {
  return await db.select('email/campaign/recipient/get', [ids])
}

EmailCampaignRecipient.insertForCampaigns = async (/** @type {IEmailCampaign[]} */campaigns) => {
  const recipients = []

  for(const campaign of campaigns) {
    const {
      to = [],
      cc = [],
      bcc = []
    } = campaign

    for(const recipient of to) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        recipient_type: Email.TO
      })
    }

    for(const recipient of cc) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        recipient_type: Email.CC
      })
    }

    for(const recipient of bcc) {
      recipients.push({
        campaign: campaign.id,
        tag: /**     @type {IEmailRecipientTagInput}   */ (recipient).tag,
        list: /**    @type {IEmailRecipientListInput}  */ (recipient).list,
        contact: /** @type {IEmailRecipientEmailInput} */ (recipient).contact,
        email: /**   @type {IEmailRecipientEmailInput} */ (recipient).email,
        recipient_type: Email.BCC
      })
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
  }
}

Orm.register('email_campaign_recipient', 'EmailCampaignRecipient', EmailCampaignRecipient)

module.exports = EmailCampaignRecipient
