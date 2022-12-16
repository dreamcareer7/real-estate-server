const config = require('../../../config')
const { peanar } = require('../../../utils/peanar')
const promisify = require('../../../utils/promisify')
const { Readable } = require('stream')
const AttachedFile = require('../../AttachedFile')
const Context = require('../../Context')
const User = require('../../User/create')

const { getByNumber } = require('../get')
const { notifyById } = require('../live')

const handler = async incoming => {
  const e = () => {
    return Error.NotAcceptable('Cannot determine the sender or deal of this message')
  }

  let attached_files
  try {
    attached_files = JSON.parse(incoming.attachments).filter(a => AttachedFile.isAllowed(a.name))
  } catch (e) {
    Context.log('Failed to parse attachments JSON', e, incoming.attachments)
    attached_files = []
  }

  const to = incoming.recipient.match(/(.*)-(.*)@/)
  if (!to || !to[2])
    throw e()

  const deal_number = to[2]
  const deal = await getByNumber(deal_number)

  const user = await User.getOrCreateByEmail(incoming.sender)

  if (incoming['body-html']) {
    const buffer = Buffer.from(incoming['body-html'])

    const stream = new Readable()
    stream._read = () => {}
    stream.push(buffer)
    stream.push(null)

    const name = incoming.subject || '<No Subject>'

    await AttachedFile.saveFromStream({
      stream,
      filename: `${name}.html`,
      relations: [{
        role: 'Deal',
        role_id: deal.id
      }],
      path: deal.id,
      public: false,
      user
    })
  }

  Context.log('Attaching', attached_files.length, 'attachments')

  for(const attachment of attached_files) {
    Context.log('Attaching', attachment.name, attachment.url, 'to', deal.id, 'by', user.email)
    await promisify(AttachedFile.saveFromUrl)({
      url: {
        url: attachment.url,
        auth: {
          user: 'api',
          pass: config.mailgun.api_key
        }
      },
      filename: attachment.name,
      relations: [{
        role: 'Deal',
        role_id: deal.id
      }],
      path: deal.id,
      public: false,
      user
    })
  }

  await notifyById(deal.id)
}

const enqueue = peanar.job({
  handler,
  name: 'enqueue_deal_email',
  queue: 'deal_email',
  exchange: 'deals',
  max_retries: 50,
  retry_exchange: 'deal_email_retry',
  error_exchange: 'deal_email.error'
})

module.exports = {
  enqueue
}
