import React from 'react'
import { Provider } from 'mobx-react'
import { initStore, loadInitialData } from '../store'
import Page, { getInitialSubs } from '../components/Page'

//Identical to Page - show how data stays persistent while navigating

export default class Other extends React.Component {
  static async getInitialProps ({req}) {
    const isServer = !!req
    const initialData = await loadInitialData(isServer, 'app', getInitialSubs)
    return { isServer, initialData }
  }

  constructor (props) {
    super(props)
    this.store = initStore(props.isServer, 'app', props.initialData)
  }

  componentDidMount() {
    console.log('other didMount, isServer=',this.props.isServer)
  }

  componentWillUnmount() {
    console.log('other willUnmount, isServer=',this.props.isServer)
  }

  render () {
    return (
      <Provider store={this.store}>
        <Page />
      </Provider>
    )
  }
}
