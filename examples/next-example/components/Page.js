import React from 'react'
import { inject, observer } from 'mobx-react'
import Link from 'next/link'
import { createAutoSubscriber } from 'firebase-nest'

  /* Real-time messages */
@observer
class MessageList extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      fetching: false,
      fetchError: null
    }
  }

  //used by createAutoSubscriber HOC
  subscribeSubs(subs) {
    //More advanced version of subscribeSubs with loading indicator and error handling.

    const { store } = this.props

    const {unsubscribe, promise} = store.subscribeSubsWithPromise(subs)

    this.setState({
      fetching: true,
      fetchError: null
    }, () => {
      promise.then(() => {
        this.setState({
          fetching: false
        })
      }, (error) => {
        this.setState({
          fetching: false,
          fetchError: error
        })
      })
    })

    return unsubscribe
  }

  renderMessage(messageKey, messageData) {
    const { store } = this.props
    const user = messageData && messageData.uid ? (store.getData('user_'+messageData.uid)) : null
    return (
      <div style={{border:'1px grey solid'}} key={messageKey}>
        <div>{messageData.text}</div>
        <div>Posted {new Date(messageData.timestamp).toString()}</div>
        <br />
        <div>User: {JSON.stringify(user)}</div>
      </div>
    )
  }
  render() {
    const { store } = this.props
    const observableMessages = store.getData('myMsgs')

    const messages = observableMessages ? observableMessages.entries() : null

    const { fetching, fetchError } = this.state

    return (
      <div>
        <Link href={'/'}><a>Navigate to self - re-render on client</a></Link>
        <br />
        <Link href={'/other'}><a>Navigate to other</a></Link>
        {fetching && !observableMessages && <div>Fetching</div>}
        {fetchError && <div>{fetchError}</div>}
        {!!messages && <div>
          Messages:
          {messages.map(entry => this.renderMessage(entry[0], entry[1]))}
        </div>
        }
      </div>
    )
  }
}

export function getInitialSubs(fbRef) {
  return [{
    subKey: 'myMsgs',
    asList: true,
    resolveFirebaseRef: () => fbRef.child('chat/messages'), //query example: .orderByChild('uid').equalTo('barney'),
    childSubs: (messageKey, messageData) => !messageData.uid ? [] : [
      {subKey: 'user_' + messageData.uid, asValue: true, resolveFirebaseRef: () => fbRef.child('chat/users').child(messageData.uid)}
    ],

    //Optional - get data callbacks after store data is already updated:
    onData: (type, snapshot) => console.log('got data: ', type, 'myMsgs', snapshot.val()),

    //Optional - transform data before it's stored. Have to return a new object for it to work
    transformChild: (messageData) => Object.assign({}, messageData, {text: (messageData.text || '').toUpperCase()})
  }]
}

export default inject('store')(createAutoSubscriber({
  getSubs: (props, state) => getInitialSubs(props.store.fbRef()),
  //subscribeSubs is defined on the component, can also be passed here
})(MessageList))
