const config = require('../../config')
const promisify = require('../../utils/promisify')

Deal.Email = {}

Deal.Email.enqueue = asycn incoming {
  const job = Job.queue.create('deal_email', {incoming})
    .removeOnComplete(true)
    .attempts(50)
    .backoff({type: 'exponential'})

  process.domain.jobs.push(job)
}

Deal.Email.accept = async incoming => {
  if (incoming.domain !== config.mailgun.domain)
    throw Error.Forbidden('Domain is invalid')

  const e = () => {
    return Error.NotAcceptable('Cannot determine the sender or deal of this message')
  }

  let attached_files
  try {
    attached_files = JSON.parse(incoming.attachments).filter(a => AttachedFile.isAllowed(a.name, a.size))
  } catch (e) {
    attached_files = []
  }

  if (attached_files.length < 1)
    throw Error.NotAcceptable('Nothing to post')

  const to = incoming.recipient.match(/deal-(.*)@/)
  if (!to || !to[1])
    throw e()

  const deal_number = to[1]
  const deal = await Deal.getByNumber(deal_number)

  const user = await promisify(User.getOrCreateByEmail)(incoming.sender)

  for(const attachment of attached_files)
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
        id: deal.id
      }],
      path: deal.id,
      public: false,
      user
    })

  await Deal.notifyById(deal.id)
}

Deal.Email.getAddress = deal => {
  return `deal-${deal.number}@${config.mailgun.domain}`
}