import React from 'react'
import { Provider } from 'mobx-react'
import { initStore, loadInitialData, allMessagesSubs } from '../store'
import Page from '../components/Page'

function getDecodedToken(req) {
  return ((req || {}).session || {}).decodedToken
}

export default class Messages extends React.Component {
  static async getInitialProps ({req}) {
    const isServer = !!req

    const initialData = await loadInitialData('app', allMessagesSubs)

    //saved in server's req.session by /api/login route. see store.js constructor
    const decodedToken = getDecodedToken(req)
    
    return { isServer, initialData, decodedToken }
  }

  constructor (props) {
    super(props)
    this.store = initStore('app', props.decodedToken, props.initialData)
  }

  componentDidMount() {
    console.log('didMount, isServer=',this.props.isServer)
  }

  componentWillUnmount() {
    console.log('willUnmount, isServer=',this.props.isServer)
  }

  render () {
    return (
      <Provider store={this.store}>
        <Page />
      </Provider>
    )
  }
}
