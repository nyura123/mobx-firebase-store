
import React, {Component} from 'react';
import MobxFirebaseStore from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

import RegisterOrLogin from './RegisterOrLogin';
import AuthStore from './AuthStore';

const apiKey = 'yourApiKey';

const fbApp = firebase.initializeApp({
  apiKey,
  authDomain: "localhost",
  databaseURL: 'https://docs-examples.firebaseio.com',
  storageBucket: 'docs-examples.firebaseio.com'
}, "chatApp");

const fbRef = firebase.database(fbApp).ref();
const store = new MobxFirebaseStore(fbRef);
const authStore = new AuthStore(fbApp);

/* Real-time messages */
class MessageList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetching: false,
      fetchError: null
    }
  }

  subscribeSubs(subs) {
    //More advanced version of subscribeSubs with loading indicator and error handling.

    const {unsubscribe, promise} = store.subscribeSubsWithPromise(subs);

    this.setState({
      fetching: true,
      fetchError: null
    }, () => {
      promise.then(() => {
        this.setState({
          fetching: false
        });
      }, (error) => {
        this.setState({
          fetching: false,
          fetchError: error
        })
      });
    });

    return unsubscribe;
  }

  renderMessage(messageKey, messageData) {
    const user = messageData ? store.getData('usrrrrr_'+messageData.uid) : null;
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
    const { fetching, fetchError } = this.state;

    return (
      <div>
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
    );
  }
}

function getLoggedInSubs() {
  return [{
    subKey: 'myMsgs',
    asList: true,
    path: 'samplechat/messages',
    forEachChild: {
      childSubs: (messageKey, messageData) => {
        return [{
          subKey: 'usrrrrr_' + messageData.uid,
          asValue: true,
          path: 'samplechat/users/' + messageData.uid
        }];
      }
    }
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

    //Using more advanced subscribeSubs option in MessageList
    //subscribeSubs: (subs) => store.subscribeSubs(subs)
})(observer(MessageList));
