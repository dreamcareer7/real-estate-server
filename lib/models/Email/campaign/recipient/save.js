const db  = require('../../../../utils/db')

const {
  TO,
  CC,
  BCC
} = require('../../../Email/constants')

const insertForCampaigns = async (/** @type {IEmailCampaignInput[]} */campaigns) => {
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
        send_type: TO,
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
        send_type: CC,
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
        send_type: BCC,
        recipient_type: (recipient).recipient_type
      })
    }
  }

  await db.query.promise('email/campaign/recipient/insert', [JSON.stringify(recipients)])
}

module.exports = {
  insertForCampaigns
}
