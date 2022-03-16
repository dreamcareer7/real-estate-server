const db     = require('../../utils/db')

const { sendSocialPost } = require('./worker')

const getDue = () => {
  return db.selectIds('social_post/due')
}

const sendDue = async () => { 
  const due = await getDue() 
  for (const id of due)
    await sendSocialPost(id)
}

module.exports = {
  getDue,
  sendDue,
}
