const Context = require('../../../Context')
const { getAll } = require('../../../User/get')


const isCampaignOlderThanAMonth = (created_at) => {
  if ( !created_at ) {
    throw Error.Validation('Campaign created_at is not valid!')
  }

  const diff = new Date().getTime() - new Date(created_at * 1000).getTime()
  const days = Math.ceil(diff / (1000 * 3600 * 24))

  if (days > 30) {
    return true
  }

  return false
}

const isRecipientOwner = async (emailCampaign, recipient) => {
  const owners = await getAll([emailCampaign.created_by, emailCampaign.from])
  const ownersEmails = owners.map(user => user.email)

  Context.log('processNotification=> Campaign:', emailCampaign.id, 'ownersEmails:', ownersEmails, 'recipient:', recipient, ownersEmails.includes(recipient))

  if (ownersEmails.includes(recipient)) {
    return true
  }

  return false
}


module.exports = {
  isCampaignOlderThanAMonth,
  isRecipientOwner
}