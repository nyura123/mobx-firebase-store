import React from 'react'
import { Provider } from 'mobx-react'
import { initStore } from '../store'
import Page, { getInitialSubs } from '../components/Page'

export default class Messages extends React.Component {
  static async getInitialProps ({req}) {
    const isServer = !!req

    //Preload data on server...
    const store = initStore(isServer, 'app')

    const { promise, unsubscribe } = store.subscribeSubsWithPromise(getInitialSubs(store.fbRef()))

    //Wait to load all data - messages and user for each message (see components/Page getInitialSubs)
    console.log('AWAIT INITIAL FIREBASE DATA...')
    await promise
    console.log('DONE AWAITING INITIAL FIREBASE DATA.')

    //Don't forget to unsubscribe - don't want to unsubscribe too early
    setTimeout(() => console.log('initialUnsubscribe from firebase') || unsubscribe(), 1000)

    //initial props should be plain data. The store's observable maps will be initialized using the plain-data initial props
    return { isServer, initialData: store.mbStore.toJS() }
  }

  constructor (props) {
    super(props)
    this.store = initStore(props.isServer, 'app', props.initialData)
  }

  componentDidMount() {
    console.log('didMount, isServer=',this.props.isServer)
    //do any initializing in store, like watching auth()
  }

  componentWillUnmount() {
    console.log('willUnmount, isServer=',this.props.isServer)
    //cleanup store if needed
  }

  render () {
    return (
      <Provider store={this.store} isServer={this.props.isServer}>
        <Page title='Index Page' linkTo='/other' />
      </Provider>
    )
  }
}
