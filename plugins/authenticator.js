'use strict'

const fp = require('fastify-plugin')
const curve = require('noise-handshake/dh')
const Authenticator = require('attest-auth')
const QRCode = require('qrcode')
const base64url = require('base64url')
// const bint = require('bint8array')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  const serverKeys = curve.generateKeypair()
  const trustedKey = curve.generateKeypair()
  const auth = new Authenticator(serverKeys, { curve })
  const trustedKeys = [ trustedKey.pub.toString('hex') ]
  const challenges = new Map()

  fastify.decorateRequest('challenge', function () {
    const request = this
    const session = request.query.session

    if (challenges.has(session)) {
      const s = challenges.get(session)

      if (s.publicKey && trustedKeys.includes(s.publicKey.toString('hex'))) {
        return 'logged in as ' + s.publicKey.slice(0, 4).toString('hex')
      } else {
        return s.challenge.toString('hex')
      }
    }

    let login = auth.createServerLogin({
      timeout: 2 * 60 * 1000,
      description: 'Bitfinex' + request.query.session
    })

    challenges.set(request.query.session, login)

    return login.challenge.toString('hex')
  })

  fastify.decorateRequest('answer', function () {
    const request = this
    console.log('received', base64url.toBuffer(request.query.payload).toString('hex'))

    let login
    try {
      login = auth.verify(base64url.toBuffer(request.query.payload))
    } catch (err) {
      return err.message
    }

    if (trustedKeys.includes(login.publicKey.toString('hex'))) {
      return 'logged in'
    }

    return 'key not trusted.'
  })

  fastify.decorate('qr', function (challenge) {
    const trustedLogin = Authenticator.createClientLogin(
      trustedKey,
      serverKeys.pub,
      challenge,
      { curve }
    )

    console.log('request', Buffer.from(trustedLogin.request).toString('hex'))
    const url = `http://auth.thebiz.pro/auth?payload=${Buffer.from(trustedLogin.request).toString('base64')}`

    console.log(url)
    return `http://localhost:3000/answer?payload=${base64url.encode(Buffer.from(trustedLogin.request))}`
    return QRCode.toDataURL(url)
  })
})
