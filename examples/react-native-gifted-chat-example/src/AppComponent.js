import React, { PropTypes } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GiftedChat from './GiftedChatWrapper';
import { inject, Provider, observer } from 'mobx-react/native';
import { createAutoSubscriber } from 'firebase-nest';

//Transform data from firebase and write to firebase.
// Assumes the following firebase data model:
//  messages: {key1: {text, timestamp, uid}, key2: {text, timestamp, uid}, ...}
//  users: {key1: {last, first}, key2: {last, first}, ...}

//write to firebase
function addMessage(fbRef, {text, uid, timestamp}) {
  return fbRef.child('chat').child('messages').push({text, uid, timestamp})
}

//tarnsform data from firebase that's stored in MobxFirebaseStore
function messagesInGiftedChatFormat(store, {limitTo, prevLimitTo}) {
  let msgs = store.getData(limitedMessagesSubKey(limitTo));

  //optimization to avoid flickering while paginating - try to get previous subscription's data while we're loading older items
  if (!msgs && prevLimitTo) {
    msgs = store.getData(limitedMessagesSubKey(prevLimitTo))
  }

  if (!msgs) {
    return [];
  }

  const res = msgs.entries().map((entry) => {
    const msgKey = entry[0];
    const msg = entry[1];
    const uid = msg.uid || null;
    const user = (uid ? store.getData(userSubKey(uid)) : null);

    //Gifted message will not update unless msgKey changes. So as user info comes in, add user's info to the message key
    const userInfoHash = user ? `${user.get('first')}_${user.get('last')}` : ''

    return {
      _id: msgKey+userInfoHash,
      text: msg.text || '',
      createdAt: new Date(msg.timestamp),
      user: {
        _id: uid,
        name: user ? (user.get('first') + ' '+user.get('last')) : '. .',
        //avatar: 'https://facebook.github.io/react/img/logo_og.png'
      }
    }
  });

  //Show latest messages on the bottom
  res.reverse();

  return res;
}


//Subscriptions
function limitedMessagesSubKey(limitTo) {
  return `msgs_limitedTo_${limitTo}`
}

function userSubKey(uid) {
  return `usr_${uid}`
}

//Get messages and user for each message
function limitedMessages(limitTo, fbRef) {
  return [{
    subKey: limitedMessagesSubKey(limitTo),
    asList: true,
    resolveFirebaseRef: () => fbRef.child('chat/messages'),//.limitToLast(limitTo || 1),
    childSubs: (messageKey, messageData) => !messageData.uid ? [] : [{
      subKey: userSubKey(messageData.uid),
      asValue: true,
      resolveFirebaseRef: () => fbRef.child('chat/users').child(messageData.uid)
    }]
  }]
}

function deferredUnsubscribe(unsubscribe) {
  //optimization to avoid flickering when paginating - keep current data for a bit while we wait for new query that includes older items
  return () => setTimeout(() => unsubscribe(), 1000);
}

//Chat component
@observer
class ChatComponent extends React.Component {
  state = {
    fetching: false,
    limitTo: 10,
    prevLimitTo: null
  }

  //used by createAutoSubscriber HOC
  subscribeSubs(subs, props, state) {
    //More advanced version of subscribeSubs with loading indicator and error handling.

    const { store } = this.props;

    const {unsubscribe, promise} = store.subscribeSubsWithPromise(subs);

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
    });

    return deferredUnsubscribe(unsubscribe)
  }

  onLoadEarlier = () => {
    this.setState((previousState) => ({
      ...previousState,
      limitTo: previousState.limitTo + 10,
      prevLimitTo: previousState.limitTo
    }));
  }

  onSend = (messages = []) => {
    const fbRef = this.props.store.fb;
    Promise.all(
      messages.map(({text, user, createdAt}) =>
        addMessage(fbRef, {text, uid: user._id || '0', timestamp: new Date(createdAt).getTime()}))
    ).catch((e) => alert('error sending message: ' + e.code))
  }

  renderError = () => {
    const { fetchError } = this.state;
    return <Text style={{textAlign:'center', fontWeight:'bold', fontSize:13, color:'darkred'}}>{fetchError}</Text>
  }

  render() {
    const { store } = this.props;
    const { limitTo, prevLimitTo, fetching, fetchError } = this.state;
    const messages = messagesInGiftedChatFormat(store, {limitTo, prevLimitTo});
    return (
      <GiftedChat
        messages={messages}
        loadEarlier={true}
        isLoadingEarlier={fetching}
        onLoadEarlier={this.onLoadEarlier}
        renderFooter={fetchError ? this.renderError : null}
        onSend={this.onSend}
        user={{
          _id: 'cookiemonster' //who are we posting as
        }}
      />
    )
  }
}

//Auto-subscriber Chat
const Chat = inject('store')(createAutoSubscriber({
  getSubs: (props, state) => limitedMessages(state.limitTo, props.store.fb)
  //defining subscribeSubs on the component for loading indicator
  // subscribeSubs: (subs, props, state) => props.store.subscribeSubs(subs)
})(ChatComponent))

export default class AppComponent extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  render() {
    return (
      <Provider store={this.props.store}>
        <Chat />
      </Provider>
    );
  }
}