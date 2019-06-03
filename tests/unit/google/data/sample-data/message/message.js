structure: {
  "id": string,
  "threadId": string,
  "labelIds": [
    string
  ],
  "snippet": string,
  "historyId": unsigned long,
  "internalDate": long,
  "payload": {
    "partId": string,
    "mimeType": string,
    "filename": string,
    "headers": [
      {
        "name": string,
        "value": string
      }
    ],
    "body": users.messages.attachments Resource,
    "parts": [
      (MessagePart)
    ]
  },
  "sizeEstimate": integer,
  "raw": bytes
}



data: {
    id: '16b1c09ae63862a4',
    threadId: '16b1c09ae63862a4',
    labelIds: ['UNREAD', 'Label_32', 'CATEGORY_PERSONAL'],
    snippet: 'Resource limit matched Service ....',
    historyId: '13523194',
    internalDate: '1559543522000',
    payload: {
        partId: '',
        mimeType: 'text/plain',
        filename: '',
        headers: [ [Object], [Object], ... ],
        body: {
            size: 351,
            data: 'UmVzb3VyY2UgbGl...'
        }
    },
    sizeEstimate: 8342
}