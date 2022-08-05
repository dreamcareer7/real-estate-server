const { peanar } = require('../../utils/peanar')
const { send } = require('./send')

const sendSocialPost = peanar.job({
  handler: send,
  queue: 'social_post',
  error_exchange: 'social_post.error',
  retry_exchange: 'social_post.retry',
  retry_delay: 40000,
  max_retries: 10,  
  name: 'sendSocialPost',
})

module.exports = {
  sendSocialPost,
}
