const config = require('../../config')
const promisify = require('../../utils/promisify')
const { Readable } = require('stream')

Deal.Email = {}

Deal.Email.enqueue = async incoming => {
  const job = Job.queue.create('deal_email', {incoming})
    .removeOnComplete(true)
    .attempts(50)
    .backoff({type: 'exponential'})

  Context.get('jobs').push(job)
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

  const to = incoming.recipient.match(/(.*)-(.*)@/)
  if (!to || !to[2])
    throw e()

  const deal_number = to[2]
  const deal = await Deal.getByNumber(deal_number)

  const user = await promisify(User.getOrCreateByEmail)(incoming.sender)

  if (incoming['body-html']) {
    const buffer = new Buffer(incoming['body-html'])

    const stream = new Readable()
    stream._read = () => {}
    stream.push(buffer)
    stream.push(null)

    const name = incoming.subject || '<No Subject>'

    await promisify(AttachedFile.saveFromStream)({
      stream,
      filename: `${name}.html`,
      relations: [{
        role: 'Deal',
        id: deal.id
      }],
      path: deal.id,
      public: false,
      user
    })
  }

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
  const street_number = Deal.getContext(deal, 'street_number', '')
  const street_name = Deal.getContext(deal, 'street_name', '')
  const street_prefix = Deal.getContext(deal, 'street_prefix', '')
  const street_suffix = Deal.getContext(deal, 'street_suffix', '')
  const unit = Deal.getContext(deal, 'unit_number', '')

  let address = `${street_name}${street_suffix}${street_prefix}${street_number}`

  if (unit)
    address += `Unit${unit}`

  let first_part

  if (address)
    first_part = address
  else
    first_part = 'deal'

  first_part = first_part
    .replace(/[^a-zA-Z0-9]+/g, '')


  return `${first_part}-${deal.number}@${config.mailgun.domain}`
}