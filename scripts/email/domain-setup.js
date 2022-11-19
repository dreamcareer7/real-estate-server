#!/usr/bin/env node

const Mailgun = require('mailgun-js')

const readline = require('readline')
const { stdin, stdout } = require('process')

require('../connection.js')
const config = require('../../lib/config')

const Email = require('../../lib/models/Email/create')
const Context = require('../../lib/models/Context')

const { peanar } = require('../../lib/utils/peanar')
const db = require('../../lib/utils/db')

const mg = Mailgun({
  apiKey: config.mailgun.api_key
})

const wait = timeout => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout * 1000)
  })
}

const createMailgunDomain = async name => {
  Context.log('Creating Domain', name)

  try {
    await mg.domains().create({name})
  } catch(e) {
    if (e.statusCode !== 400)
      throw e

    Context.log('Domain already exists', name)
  }
}

const getInfo = domain => {
  return mg.get(`/domains/${domain}`)
}

const isVerified = async domain => {
  const info = await getInfo(domain)
  return info.domain.state === 'active'
}

const verifyDomain = async mailgunDomain => {
  Context.log('Verifying domain')

  await mg.put(`/domains/${mailgunDomain}/verify`)

  Context.log('Waiting for 30 seconds')

  await wait(30)

  if (await isVerified(mailgunDomain)) {
    Context.log('Congrats! Your domain just got verified')
    return
  }

  await sendInstructions(mailgunDomain)
}

const ensureMailgunDomain = async domain => {
  const mailgunDomain = `rechat-mail.${domain}`
  await createMailgunDomain(mailgunDomain)
  await ensureWebhooks(mailgunDomain)
  await ensureTracking(mailgunDomain)
  await ensureHttps(mailgunDomain)

  if (!(await isVerified(mailgunDomain))) {
    await verifyDomain(mailgunDomain)
  }

  await ensureSetup(mailgunDomain, domain)

  Context.log('Domain is verified')

}

const ask = question => {
  return new Promise(resolve => {
    const rl = readline.createInterface({input: stdin, output: stdout})

    rl.question(question, resolve)
  })
}

const formattRecord = record => {
  if (record.valid === 'valid')
    return ''


  const items = [
    {label: 'Type', attr: 'record_type'},
    {label: 'Name', attr: 'name'},
    {label: 'Value', attr: 'value'},
    {label: 'Priority', attr: 'priority'}
  ]

  let html = ''

  for(const item of items) {
    if (!record[item.attr])
      continue

    html += `<span class="h">${item.label}:</span> \t <span class="v">${record[item.attr]}</span><br>`
  }

  return html
}

const sendInstructions = async mailgunDomain => {

  const to = (await ask('The DNS Settings are not set yet. Enter an email address to send instructions to.\n')).split(',')
  const name = await ask('What\'s the recipient\'s name?\n')

  const info = await getInfo(mailgunDomain)

  const html = `
  <style>
      .h {
          font-family:monospace;font-style:normal;font-variant-ligatures:normal;font-variant-caps:normal;letter-spacing:normal;text-align:start;text-indent:0px;text-transform:none;white-space:normal;word-spacing:0px;background-color:rgb(255,255,255);text-decoration-style:initial;text-decoration-color:initial; font-weight: bold;
      }

      .v {
          color:rgb(34,34,34);font-family:monospace;font-style:normal;font-variant-ligatures:normal;font-variant-caps:normal;font-weight:400;letter-spacing:normal;text-align:start;text-indent:0px;text-transform:none;white-space:normal;word-spacing:0px;background-color:rgb(255,255,255);text-decoration-style:initial;text-decoration-color:initial;display:inline!important;float:none
      }
  </style>

  Hi ${name},<br>
                  In order to complete Rechat's setup, we need to apply some changes to your domain. These changes will not break anything and are there to ensure fantastic deliverability of the emails you send from Rechat.
                  <a href="https://rechat.gitbook.io/rechat.-help-center/appendix/brokerage-set-up/email-delivery">Here is some more information</a> about this process.

                  <br>The following are the DNS records that need to be added. If you don't know what that means, its a sign you need to get in touch with the owner of the domain or your IT team. <br><br>

                  ${[...info.receiving_dns_records, ...info.sending_dns_records].map(record => {
                      if (!record.name) //Mailgun MX domain's (receiving_dns_records) don't have a name but the formattRecord needs it
                        record.name = mailgunDomain

                    return formattRecord(record)
                  }).join('<br>')}

                  <br>
                  Please let us know if you have any questions on this.`

  const email = {
    subject: 'Rechat Setup',
    from: 'emil@rechat.com',
    to,
    html,
  }

  await Email.create(email)

  await peanar.enqueueContextJobs()
  await wait(5) // Need to wait until the email is actually sent
  process.exit()
}

const url = 'https://api.rechat.com/emails/events'
const webhooks = [
  'clicked', 'complained', 'delivered', 'opened', 'permanent_fail', 'temporary_fail', 'unsubscribed'
]

const ensureWebhooks = async mailgunDomain => {
  const current = (await mg.get(`/domains/${mailgunDomain}/webhooks`)).webhooks

  for (const id of webhooks) {
    if (current[id]?.urls.includes(url))
      continue

    Context.log('Setting up Webhook for', id)

    await mg.post(`/domains/${mailgunDomain}/webhooks`, {
      id,
      url
    })
  }
}

const ensureHttps = async mailgunDomain => {
  const info = await getInfo(mailgunDomain)

  if (info.web_scheme !== 'https')
    await mg.put(`/domains/${mailgunDomain}`, {
      web_scheme: 'https'
    })
}

const ensureTracking = async mailgunDomain => {
  const u = `/domains/${mailgunDomain}/tracking`
  const current = (await mg.get(u)).tracking

  if (!current.open.active)
    await mg.put(`${u}/open`, {active: 'yes'})

  if (!current.click.active)
    await mg.put(`${u}/click`, {active: 'yes'})

  if (current.unsubscribe.active)
    await mg.put(`${u}/unsubscribe`, {active: false})
}

const ensureSetup = async (mailgunDomain, domain) => {
  return db.executeSql.promise('INSERT INTO mailgun_domains(mailgun_domain, domain) VALUES ($1, $2) ON CONFLICT DO NOTHING', [mailgunDomain, domain])
}

const run = async () => {
  const domain = process.argv[2]

  await ensureMailgunDomain(domain)
}

run()
  .catch(e => {
    Context.log(e)
    process.exit()
  })
  .then(process.exit)
