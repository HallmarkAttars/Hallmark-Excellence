export function toNodeRequest(event) {
  const headers = {}
  for (const [key, value] of Object.entries(event.headers || {})) {
    headers[String(key).toLowerCase()] = value
  }

  const query = event.queryStringParameters || {}
  const path = event.path || '/'
  const rawQuery = event.rawQuery || new URLSearchParams(query).toString()
  const url = event.rawUrl || `${path}${rawQuery ? `?${rawQuery}` : ''}`
  const body = event.body

  return {
    method: event.httpMethod || 'GET',
    url,
    headers,
    query,
    body,
    [Symbol.asyncIterator]: async function* () {
      if (body) {
        yield event.isBase64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body)
      }
    },
  }
}

function toBuffer(chunk) {
  return Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
}

export function createNodeResponse() {
  const headers = {}
  const chunks = []

  const res = {
    statusCode: 200,
    setHeader(key, value) {
      headers[String(key).toLowerCase()] = value
    },
    getHeader(key) {
      return headers[String(key).toLowerCase()]
    },
    removeHeader(key) {
      delete headers[String(key).toLowerCase()]
    },
    status(code) {
      res.statusCode = code
      return res
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) chunks.push(toBuffer(chunk))
      res.finished = true
    },
    send(chunk) {
      if (chunk !== undefined && chunk !== null) chunks.push(toBuffer(chunk))
      res.finished = true
    },
    json(value) {
      if (!headers['content-type']) headers['content-type'] = 'application/json; charset=utf-8'
      chunks.push(Buffer.from(JSON.stringify(value)))
      res.finished = true
    },
    getResult() {
      return {
        statusCode: res.statusCode,
        headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }
    },
  }

  return res
}

export function adapt(handler) {
  return async (event) => {
    const req = toNodeRequest(event)
    const res = createNodeResponse()
    await handler(req, res)
    return res.getResult()
  }
}
