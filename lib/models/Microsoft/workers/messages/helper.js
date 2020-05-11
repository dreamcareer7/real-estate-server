const getByInternetMsgId = async function(microsoft, select, expand, iMsgId) {
  const url = `https://graph.microsoft.com/v1.0/me/messages${select}&$filter=internetMessageId eq '<${iMsgId}>'${expand}`

  try {
    const messages = await microsoft.geMessagesByUrl(url)

    return {
      status: 200,
      body: messages[0]
    }

  } catch (ex) {
    return {
      status: 404,
      body: {
        id: null,
        isRead: null,
        bodyPreview: 'Email is moved or deleted in the remote server',
        body: { content: 'Email is moved or deleted in the remote server' },
        uniqueBody: { content: 'Email is moved or deleted in the remote server' },
        attachments: []
      }
    }
  }
}


module.exports = getByInternetMsgId