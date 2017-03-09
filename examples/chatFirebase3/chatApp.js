
import React, {Component} from 'react';
import MobxFirebaseStore from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

const fbApp = firebase.initializeApp({
  apiKey: 'yourApiKey',
  authDomain: "localhost",
  databaseURL: 'https://docs-examples.firebaseio.com',
  storageBucket: 'docs-examples.firebaseio.com'
}, "chatApp");

const fbRef = firebase.database(fbApp).ref();
const store = new MobxFirebaseStore(fbRef);

/* Real-time messages */
class MessageList extends Component {
    renderMessage(messageKey, messageData) {
      console.log(messageData.uid)
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
        if (!messages) {
            return <div>Loading messages...</div>
        }
        return (
          <div>
              Messages:
              {messages.keys().map(messageKey => this.renderMessage(messageKey, messages.get(messageKey)))}
          </div>
        );
    }
}

//Subscribe to and observe firebase data
export default createAutoSubscriber({
    getSubs: (props, state) => {
        //Subscribe to messages and user for each message
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
    },

    subscribeSubs: (subs) => {
        return store.subscribeSubs(subs);
    }
})(observer(MessageList));
