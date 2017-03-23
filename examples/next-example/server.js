//const { createServer } = require('http')
const { parse } = require('url')
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

//populates global.serverFirebase so components can access the firebase-admin for server-side rendering
require('./serverFirebase')

function storeDecodedTokenInSession(token, req) {
  return global.serverFirebase.auth().verifyIdToken(token)
    .then((decodedToken) => {
      req.session.decodedToken = decodedToken
      return decodedToken
    })
}

function removeDecodedTokenInSession(req) {
  req.session.decodedToken = null
}

app.prepare()
  .then(() => {
    const server = express()

    // parse application/json
    server.use(bodyParser.json())

    // Configure session
    server.use(session({
      secret: 'boogiewoogie',
      store: new FileStore({path: '/tmp/sessions', secret: 'boogiewoogie'}),
      resave: false,
      rolling: true,
      saveUninitialized: true,
      httpOnly: true,
      cookie: {
        maxAge: 60000 * 60 * 24 * 7 * 4
      }
    }))

    server.post('/api/login', (req, res) => {
      if (!req.body) return res.sendStatus(400)
      const token = req.body.token
      storeDecodedTokenInSession(token, req)
        .then((decodedToken) => res.json({result: 'signed in', decodedToken}))
        .catch((error) => res.json({error}))
    })
    
    server.post('/api/logout', (req, res) => {
      removeDecodedTokenInSession(req)
      res.json({result: 'signed out'})
    })

    //protected routes - can redirect here.
    //A better option is to have the protected route just display the Login component when needed
    // server.get('/other', (req, res) => {
    //   if (!req.session.decodedToken) {
    //     res.redirect('/')
    //   } else {
    //     return handle(req, res)
    //   }
    // })

    server.get('*', (req, res) => {
      return handle(req, res)
    })

    server.listen(3000, (err) => {
      if (err) throw err
      console.log('> Ready on http://localhost:3000')
    })

    // createServer((req, res) => {
    //   const parsedUrl = parse(req.url, true)
    //     handle(req, res, parsedUrl)
    // })
    //   .listen(3000, (err) => {
    //     if (err) throw err
    //     console.log('> Ready on http://localhost:3000')
    //   })
  })