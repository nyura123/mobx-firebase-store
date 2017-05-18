import React from 'react'
import { Provider } from 'mobx-react'
import { initStore, loadInitialData, limitedMessagesSubs, getFirebaseInfo } from '../store'
import Page from '../components/Page'
import Head from 'next/head'

function getDecodedToken(req) {
  return ((req || {}).session || {}).decodedToken
}

export default class Main extends React.Component {
  static async getInitialProps ({req, query}) {
    console.log('INDEX getInitialProps')
    const isServer = !!req

    const limitTo = query.limitTo ? parseInt(query.limitTo) : 2

    const { app, ref } = getFirebaseInfo()
    
    //saved in server's req.session by /api/login route. We then pass it to store
    //so components can query whether user is logged in on the server
    const decodedToken = getDecodedToken(req)
    
    const initialData = await loadInitialData('app', limitedMessagesSubs(limitTo, ref))
    
    return { isServer, initialData, decodedToken, limitTo }
  }

  constructor (props) {
    super(props)
    this.store = initStore('app', props.decodedToken, props.initialData)
  }

  componentDidMount() {
    console.log('INDEX didMount, isServer=',this.props.isServer)
  }

  componentWillUnmount() {
    console.log('INDEX willUnmount, isServer=',this.props.isServer)
  }

  render () {
    return (
      <div>
        <Head>
          <title>Main Page</title>
        </Head>
        <Provider store={this.store}>
          <Page title='index.js' limitTo={this.props.limitTo} />
        </Provider>
      </div>
    )
  }
}
