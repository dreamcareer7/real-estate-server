const MicrosoftCredential = require('./credential')
const getClient = require('./client')


const test = async (req, res) => {
  const cid = 'debcc087-fd59-4635-8fda-d65264ee82cf'

  const microsoftCredential = await MicrosoftCredential.get(cid)
  const microsoft = await getClient(microsoftCredential.id, 'outlook')

  const message = {
    message_id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAEvxJ0_AAA='
  }

  const attachment = {
    name: 'my_attachment_1',
    url: 'https://private-cdn.irish.rechat.com/95b9c3ac-49a7-11e9-8abe-0a95998482ac/1e5abf80-6ed3-11ea-a4d7-3f9fcda1728a.jpg?Expires=1585252788&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLWNkbi5pcmlzaC5yZWNoYXQuY29tLzk1YjljM2FjLTQ5YTctMTFlOS04YWJlLTBhOTU5OTg0ODJhYy8xZTVhYmY4MC02ZWQzLTExZWEtYTRkNy0zZjlmY2RhMTcyOGEuanBnIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNTg1MjUyNzg4fX19XX0_&Signature=KaHTR2bqVDxTcpr-BV7130JEfgUXdSrhy2yT965CQ9ubnUPgG~fcLpkZp2hfBvpjbnoKg8RPFqJhysiNbPeHXrq-4D9k5nU3ArUEowQyoZDYvd2wGoPSz~GlnbAYamFJo7jbGDzW1UWRJtlPE1cvestspv4ASI6WCu2MkGyuIuTWXQ1CSlILTOui1Q2BYt8j-P1BkL09~u7qYy5e6zXPyWwBKWfeWj11FnZDcnICHhxR1RBstcFRMeqVU9nk8yl4EcjJUzl0Lh~l5uIRbh7MAbPXBOvmUHNoW8W2Jn3UcPd~cPp31xnk3od1JDSuJQZJSfMHSbzPB7qUAqUtEJjcgw__&Key-Pair-Id=APKAIIRG223GKFAC4MHA'
  }

  const result = await microsoft.uploadSession(message.message_id, attachment)
  console.log('--- result', result)

  return res.json({})
}


module.exports = {
  test
}