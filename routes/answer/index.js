'use strict'

module.exports = async function (fastify, opts) {

  fastify.get('/', async function (request, reply) {
    const authed = request.answer()

    return authed
  })
}
