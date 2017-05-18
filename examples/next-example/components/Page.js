import React from 'react'
import PropTypes from 'prop-types'
import { inject, observer } from 'mobx-react'
import Link from 'next/link'
import { createAutoSubscriber } from 'firebase-nest'
import RegisterOrLogin from './RegisterOrLogin'
import AddMessage from './AddMessage'
import { limitedMessagesSubs } from '../store'

import Graph from 'react-graph-vis'
import DevTools from 'mobx-react-devtools'

function deferredUnsubscribe(unsubscribe) {
  //optimization to avoid flickering when paginating - keep current data for a bit while we wait for new query that includes older items
  return () => setTimeout(() => unsubscribe(), 1000);
}

  /* Real-time messages */
@observer
class MessageList extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired,
    limitTo: PropTypes.number
  }

  state = {
    fetching: false,
    fetchError: null,
    limitTo: this.props.limitTo || 1,
    prevLimitTo: null
  }

  //used by createAutoSubscriber HOC
  subscribeSubs(subs, props, state) {
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

    return deferredUnsubscribe(unsubscribe)
  }

  componentDidUpdate() {
    //TODO only do this if we were already at the bottom
    //this.scrollToBottom()
  }
  
  render() {

    const { title, store, isProtected } = this.props

    const { limitTo } = this.state
    let observableMessages = store.limitedMessages(limitTo)

    //optimization to avoid flickering while paginating - try to get previous subscription's data while we're loading older items
    if (!observableMessages && this.state.prevLimitTo) {
      observableMessages = store.limitedMessages(this.state.prevLimitTo)
    }

    const messages = observableMessages ? observableMessages.entries() : null

    const { fetching, fetchError, error } = this.state

    const isLoggedIn = !!store.authUser()

    const graphVisOptions = {
      layout: {
        hierarchical: true
      },
      edges: {
        color: "#000000"
      }
    }

    const graphVisEvents = {
      select: function(event) {
        const { nodes, edges } = event;
      }
    }

    return (
      <div>
        <h1>{title}</h1>

        <div style={{display:'inline-block',width:'70%'}}>
          <Link href={'/'}><a>Navigate to self - re-render on client</a></Link>
          <br />
          <Link href={'/other'}><a>Navigate to other</a></Link>
          <br />
          <h1><RegisterOrLogin authStore={store} /></h1>
          <br />
          <GetOlder getOlder={this.getOlder} />


          {isProtected && <h3 style={{textAlign:'center'}}>Protected Route</h3>}
          {isProtected && !isLoggedIn && <div>Will not subscribe to data if logged out - see getSubs</div>}
          {fetching && !observableMessages && <div>Fetching</div>}
          {fetchError && <div style={{color:'red'}}>{fetchError}</div>}
          {error && <div style={{color:'red'}}>{error}</div>}

          <Messages messages={messages} store={store} deleteMessage={this.deleteMessage} />

          <div style={{float:'left', clear:'both'}} ref={(ref) => { this.messagesEnd = ref }} />

          <div style={{height:40}} />

          <AddMessage />

          <h1>Subscription Graph</h1>

          <DevTools />
        </div>

        <div style={{display:'inline-block',width:'30%', textAlign: 'left', verticalAlign: 'top'}}>
          <div style={{display:'inline-block'}}>
            <Graph key={store.subscriptionGraph.version} graph={store.subscriptionGraph.get()} options={graphVisOptions} events={graphVisEvents} />
          </div>
        </div>

      </div>
    )
  }

  getOlder = () => {
    this.setState({
      limitTo: this.state.limitTo + 3,
      prevLimitTo: this.state.limitTo
    })
  }

  scrollToBottom = () => {
    this.messagesEnd && this.messagesEnd.scrollIntoView({behavior: "smooth"});
  }

  deleteMessage = (messageKey) => {
    this.setState({error: null}, () => {
      this.props.store.deleteMessage(messageKey)
        .catch((error) => {
          this.setState({error: error.code})
        })
    })
  }
}

const Messages = ({store, messages, deleteMessage}) => {
  if (!messages) return null
  return (
    <div>
      Messages:
      {messages.map(entry => (
          <Message key={entry[0]} deleteMessage={deleteMessage} messageKey={entry[0]} message={entry[1]} store={store} />
        )
      )}
    </div>
  )
}

const Message = ({store, messageKey, message, deleteMessage}) => {
  const user = message && message.uid ? (store.user(message.uid)) : null
  return (
    <div style={{border:'1px grey solid'}}>
      <div>{message.text}</div>
      <div>Posted {new Date(message.timestamp).toString()}</div>
      <br />
      <div>User: {JSON.stringify(user)}</div>
      <br />
      <button onClick={() => deleteMessage(messageKey)}>Delete</button>
    </div>
  )
}

const GetOlder = ({getOlder}) => {
  return (
    <button style={{fontSize:'20px'}} onClick={getOlder}>Get More </button>
  )
}

export default inject('store')(createAutoSubscriber({
  getSubs: (props, state) => props.isProtected && !props.store.authUser() ? [] : limitedMessagesSubs(state.limitTo, props.store.fbRef()),
  //subscribeSubs is defined on the component, can also be passed here
})(MessageList))
