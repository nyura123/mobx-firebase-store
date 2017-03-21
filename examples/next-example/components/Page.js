import React from 'react'
import { inject, observer } from 'mobx-react'
import { observable } from 'mobx'
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
        {fetching && !observableMessages && <div>Fetching</div>}
        {fetchError && <div>{fetchError}</div>}
        <div>{this.state.renderTrigger}</div>
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
    ]
  }]
}

export default inject('store')(createAutoSubscriber({
  getSubs: (props, state) => getInitialSubs(props.store.fbRef())
})(MessageList))
