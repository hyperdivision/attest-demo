'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    const challenge = request.challenge()
    if (challenge.substring(0, 12) === 'logged in as') return challenge

    const qr = await fastify.qr(challenge)
    reply.type('text/html')

    return `
      <html>
      <head></head>
      <body>
        ${qr}
      </body>
      </html>
    `
  })
}

// <img width=512px height=512px src='${qr}'>
