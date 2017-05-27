
import React, {Component} from 'react';
import MobxFirebaseStore, {ObservableSubscriptionGraph} from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

import GiftedChat, { messagesInGiftedChatFormat } from '../gifted-chat-component/GiftedChat';

const apiKey = 'yourApiKey';

const fbApp = firebase.initializeApp({
  apiKey,
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',
  storageBucket: 'testing-3bba1.firebaseio.com'
}, "gifted");

const fbRef = firebase.database(fbApp).ref();

//set unsubscribeDelayMs as an optimization to avoid flickering when getting pages of data
// - delay unsubscribing from current page so that newer page's data is received before we unsubscribe current page data and delete its data from the store.
// Prevents empty data flickering.
const store = new MobxFirebaseStore(fbRef, {unsubscribeDelayMs: 1000});

/* Playground, showcases getMore and data entry */

function addItem({text, uid, timestamp}) {
  const msgKey = fbRef.child('playground').child('messages').push().key;
  const updates = {
    [`messages/${msgKey}`]: {text, uid, timestamp: timestamp || new Date().getTime()},
    [`users/${uid}`]: uid
  }
  console.log('updating...',updates)
  return fbRef.child('playground').update(updates);
}

function deleteItem(key) {
  return fbRef.child('playground').child('messages').child(key).remove();
}

function deleteAll() {
  return fbRef.child('playground').child('messages').remove();
}

const limitTo = 3;
const moreItemsIncrement = 2;


class LimitToExample extends Component {
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.deleteLastItem = this.deleteLastItem.bind(this);
    this.deleteAll = this.deleteAll.bind(this);
    this.getOlder = this.getOlder.bind(this);

    this.state = {
      pagination: {limitTo},
      prevPagination: null,
      writeError: null,
      uid: 'frank'
    }
  }

  renderItem(key, item) {
    return (
      <div style={{border:'1px grey solid'}} key={key}>
        {key}{':'}{JSON.stringify(item)}
      </div>
    );
  }

  addItem() {
    const { text, uid } = this.state;
    this.setState({
      writeError: null
    }, () => {
      addItem({text, uid})
        .then(() => this.setState({text: ''}))
        .catch((error) => this.setState({writeError: error.code}))
    });
  }

  deleteLastItem() {
    const items = this.getItems();
    if (items && items.length > 0) {
      const lastItemKey = items[items.length-1][0];
      this.setState({
        writeError: null
      }, () => {
        deleteItem(lastItemKey)
          .catch((error) => this.setState({writeError: error.code}));
      });
    }
  }

  deleteAll() {
    this.setState({
      writeError: null
    }, () => {
      deleteAll()
        .catch((error) => this.setState({writeError: error.code}));
    });
  }

  getOlder() {
    const { pagination : {limitTo} = {} } = this.state;
    this.setState({
      pagination: {limitTo: limitTo + moreItemsIncrement},
      prevPagination: this.state.pagination
  });
  }

  getItems() {
    const { pagination: {limitTo} = {} } = this.state;
    const subKey = limitedMessagesSubKey(limitTo);

    let items = store.getData(subKey);

    if (!items && this.state.prevPagination) {
      //optimization to avoid flickering - try to get previous pagination while we're loading older items
      items = store.getData(limitedMessagesSubKey(this.state.prevPagination.limitTo));
    }

    return items ? items.entries() : [];
  }

  giftedChatSendMessages = (messages = []) => {
    this.setState({
        writeError: null
    }, () => {
      Promise.all(
        messages.map(({text, user, createdAt}) =>
          addItem({text, uid: user._id || '0', timestamp: new Date(createdAt).getTime()})))
        .catch((error) => this.setState({writeError: error.code}))
    });
  }
  
  render() {
    const items = this.getItems();

    const messages = messagesInGiftedChatFormat({store, msgs: items});

    const {
      writeError,
      _autoSubscriberError: fetchError,
      _autoSubscriberFetching: fetching,
      pagination: {limitTo},
      text,
      uid
    } = this.state;

    const noMoreMessages = !fetching && items.length < limitTo;

    return (
      <div>

        <h3>Code for this example:{' '}
          <a href='https://github.com/nyura123/mobx-firebase-store/tree/master/examples/gifted-chat'
             target='_blank' >
            gifted-chat
          </a>

        </h3>

        <div>
          {writeError && <div style={{color:'red'}}>Error writing to firebase: {JSON.stringify(writeError)}</div>}
          {fetchError && <div style={{color:'red'}}>Error fetching data: {JSON.stringify(fetchError)}</div>}
          <div style={{height: 30}}>{fetching ? 'Loading...' : ''}</div>

          <section style={{marginTop:20}}>
            <input style={{fontSize:'20px'}}
                   placeholder='Message Text'
                   value={text || ''}
                   onChange={({target:{value}}) => this.setState({text: value})}
            />
            <input style={{fontSize:'20px'}}
                   placeholder='enter user key (must be a valid firebase key)'
                   value={uid || ''}
                   onChange={({target:{value}}) => this.setState({uid: value})}
            />

            <br />
            <button onClick={this.addItem}>Send Message</button>
          </section>

          <section style={{marginTop:20}}>
          <button onClick={this.deleteLastItem}>Delete Last Message</button>
          <button onClick={this.deleteAll}>Delete All Messages</button>
            </section>
          <br />
          <button onClick={() => this.getOlder()}>Get More Messages</button>
          <div style={{visibility: noMoreMessages?'visible':'hidden'}}>No More Messages</div>

        </div>

        <div>
          <h3>experimental - react-native-web + react-native-gifted-chat</h3>
          <GiftedChat
            messages={messages}
            style={{height:300}}
            ownUid="frank"
            onSend={this.giftedChatSendMessages}
            loadEarlierLabel={noMoreMessages ? 'No more messages' : 'Load earlier messages'}
            isLoadingEarlier={fetching}
            loadEarlier={this.getOlder}
          />
        </div>

      </div>
    );
  }
}

function limitedMessagesSubKey(limitTo) {
  return `messages_${limitTo}`
}

//Example of pagination based on state
function getSubs(props, state) {
  const { pagination: {limitTo} = {}} = state;
  return [{
    subKey: limitedMessagesSubKey(limitTo),//make key dependent on pagination to trigger resubscription,
    asValue: true, //if using orderBy*, have to get data as value instead of list
    resolveFirebaseRef: () => fbRef.child('playground').child('messages').orderByChild('timestamp').limitToLast(limitTo),
    childSubs: (messageKey, val) => [{
      subKey: 'user_'+(val.uid||'unknown'),
      asValue: true,
      resolveFirebaseRef: () => fbRef.child('playground').child('users').child(val.uid||'unknown')
    }]
  }];
}

//Subscribe to and observe firebase data
export default createAutoSubscriber({
  getSubs,

  //Returning subscribeSubsWithPromise allows autoSubscriber to track loading status and firebase fetch errors
  subscribeSubs: (subs) => store.subscribeSubsWithPromise(subs)
})(observer(LimitToExample));
