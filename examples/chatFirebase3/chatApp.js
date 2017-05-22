
import React, {Component} from 'react';
import MobxFirebaseStore, { ObservableSubscriptionGraph } from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';
import SubscriptionGraph from '../subscriptionGraph/subscriptionGraph';

import RegisterOrLogin from './RegisterOrLogin';
import AuthStore from './AuthStore';

const apiKey = 'yourApiKey'

const fbApp = firebase.initializeApp({
  apiKey,
  authDomain: "localhost",
  databaseURL: 'https://docs-examples.firebaseio.com',
  storageBucket: 'docs-examples.firebaseio.com'
}, "chatApp");

const fbRef = firebase.database(fbApp).ref();
const store = new MobxFirebaseStore(fbRef);
const subscriptionGraph = new ObservableSubscriptionGraph(store);
const authStore = new AuthStore(fbApp);

/* Real-time messages */
class MessageList extends Component {

  renderMessage(messageKey, messageData) {
    const user = messageData ? store.getData('user_'+messageData.uid) : null;
    return (
      <div style={{border:'1px grey solid'}} key={messageKey}>
        <div>{messageData.text}</div>
        <div>Posted {new Date(messageData.timestamp).toString()}</div>
        <br />
        <div>User: {JSON.stringify(user)}</div>
      </div>
    );
  }
  
  render() {
    const messages = store.getData('myMsgs');
    const apiKeyNeedsUpdating = apiKey == 'yourApiKey';

    //autoSubscriber provides fetching and error state
    const { _autoSubscriberFetching: fetching, _autoSubscriberError: fetchError } = this.state;

    return (
      <div>

        <div style={{width:'30%',display:'inline-block'}}>
          <h1><RegisterOrLogin authStore={authStore} /></h1>
          {apiKeyNeedsUpdating && <h1 style={{color:'red'}}>Replace apiKey in examples/chatFirebase3/chatApp.js with your key</h1>}
          {fetching && <div>Fetching</div>}
          {fetchError && <div>{fetchError}</div>}
          {!!messages && <div>
            Messages:
            {messages.keys().map(messageKey => this.renderMessage(messageKey, messages.get(messageKey)))}
          </div>
          }
        </div>

        <div style={{width:'68%',display:'inline-block',verticalAlign:'top'}}>
          <h1>Subscription Graph</h1>
          <SubscriptionGraph graph={subscriptionGraph.get()} />
        </div>
      </div>
    );
  }
}

function getLoggedInSubs() {
  return [{
    subKey: 'myMsgs',
    asList: true,
    resolveFirebaseRef: () => fbRef.child('samplechat/messages'), //query example: .orderByChild('uid').equalTo('barney'),
    childSubs: (messageKey, messageData) => !messageData.uid ? [] : [
      {subKey: 'user_' + messageData.uid, asValue: true, resolveFirebaseRef: () => fbRef.child('samplechat/users').child(messageData.uid)}
    ],
    
    //Optional - get data callbacks after store data is already updated:
    onData: (type, snapshot) => console.log('got data: ', type, 'myMsgs', snapshot.val()),
    
    //Optional - transform data before it's stored. Have to return a new object for it to work
    transformChild: (messageData) => Object.assign({}, messageData, {text: (messageData.text || '').toUpperCase()})
  }];
}

function getLoggedOutSubs() {
  return [];
}

//Subscribe to and observe firebase data
export default createAutoSubscriber({
    getSubs: (props, state) => getLoggedInSubs(),
    //can make getSubs auth-dependent:
    //getSubs: (props, state) => authStore.isLoggedIn() ? getLoggedInSubs() : getLoggedOutSubs(),

    //Returning subscribeSubsWithPromise allows autoSubscriber to track loading status and firebase fetch errors
    subscribeSubs: (subs) => store.subscribeSubsWithPromise(subs)
})(observer(MessageList));

