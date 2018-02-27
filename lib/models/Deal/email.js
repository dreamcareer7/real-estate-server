const config = require('../../config')
const promisify = require('../../utils/promisify')

Deal.Email = {}

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

  const to = incoming.recipient.match('/deal-(.*)@/')
  if (!to || !to[1])
    throw e()

  const deal_id = to[1]

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
        id: deal_id
      }],
      path: deal_id,
      public: false,
      user
    })
}