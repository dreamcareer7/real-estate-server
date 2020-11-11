/*
  Some helper functions to process Emain Notificaiotns.
*/

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


module.exports = {
  isCampaignOlderThanAMonth
}