import React from 'react'
import { Provider } from 'mobx-react'
import { initStore, loadInitialData, limitedMessagesSubs, getFirebaseInfo } from '../store'
import Page from '../components/Page'
import Head from 'next/head'

//Protected route. Also shows how data stays persistent while navigating

function getDecodedToken(req) {
  return ((req || {}).session || {}).decodedToken
}

export default class Other extends React.Component {
  static async getInitialProps ({req, query}) {
    console.log('OTHER getInitialProps')
    const isServer = !!req

    const limitTo = query.limitTo ? parseInt(query.limitTo) : 2

    const { app, ref } = getFirebaseInfo()

    //saved in server's req.session by /api/login route. We then pass it to store
    //so components can query whether user is logged in on the server
    const decodedToken = getDecodedToken(req)

    const initialData = decodedToken ? await loadInitialData('app', limitedMessagesSubs(limitTo, ref)) : {}

    return { isServer, decodedToken, initialData, limitTo }
  }

  constructor (props) {
    super(props)
    this.store = initStore('app', props.decodedToken, props.initialData)
  }

  // componentWillMount() {
  //   // redirect on client if not logged in.
  //   // server redirect is done in server.js
  //   if (!this.store.authUser()) {
  //     window.location = '/'
  //   }
  // }

  componentDidMount() {
    console.log('other didMount, isServer=',this.props.isServer)

    // this.unwatchAuth = this.store.watchAuth((user) => {
    //   if (!user) {
    //     window.location = '/'
    //   }
    // })
  }

  componentWillUnmount() {
    console.log('other willUnmount, isServer=',this.props.isServer)
    this.unwatchAuth && this.unwatchAuth()
  }

  render () {
    return (
      <div>
        <Head>
          <title>Other Page</title>
        </Head>
        <Provider store={this.store}>
          <Page title='next-example/pages/index.js' isProtected={true} limitTo={this.props.limitTo} />
        </Provider>
      </div>
    )
  }
}
