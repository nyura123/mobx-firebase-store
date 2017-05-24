
import React, {Component} from 'react';
import MobxFirebaseStore, {ObservableSubscriptionGraph} from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

import SubscriptionGraph from '../subscriptionGraph/subscriptionGraph';

const apiKey = 'yourApiKey';

const fbApp = firebase.initializeApp({
  apiKey,
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',
  storageBucket: 'testing-3bba1.firebaseio.com'
}, "play");

const fbRef = firebase.database(fbApp).ref();

//set unsubscribeDelayMs as an optimization to avoid flickering when getting pages of data
// - delay unsubscribing from current page so that newer page's data is received before we unsubscribe current page data and delete its data from the store.
// Prevents empty data flickering.
const store = new MobxFirebaseStore(fbRef, {unsubscribeDelayMs: 1000});

const subscriptionGraph = new ObservableSubscriptionGraph(store);

/* Playground, showcases getMore and data entry */

function addItem({text, uid}) {
  const msgKey = fbRef.child('playground').child('messages').push().key;
  const updates = {
    [`messages/${msgKey}`]: {text, uid, timestamp: new Date().getTime()},
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
        .then(() => this.setState({value: ''}))
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
    const subKey = `messages_${limitTo}`;

    let items = store.getData(subKey);

    if (!items && this.state.prevPagination) {
      //optimization to avoid flickering - try to get previous pagination while we're loading older items
      items = store.getData(`messages_${this.state.prevPagination.limitTo}`)
    }

    return items ? items.entries() : [];
  }

  render() {
    const items = this.getItems();

    const {
      writeError,
      _autoSubscriberError: fetchError,
      _autoSubscriberFetching: fetching,
      pagination: {limitTo},
      text,
      uid
    } = this.state;

    return (
      <div>

        <h3>Code for this example:{' '}
          <a href='https://github.com/nyura123/mobx-firebase-store/tree/master/examples/pagination'
             target='_blank' >
            Pagination
          </a>

        </h3>
        <div style={{width:'30%',display:'inline-block'}}>
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

          <section style={{marginTop:20}}>
            Querying for {limitTo} latest items, {items.length} items found:
            {items && items.map((entry) => this.renderItem(entry[0], entry[1]))}
          </section>

        </div>

        <div style={{width:'68%',display:'inline-block',verticalAlign:'top'}}>
          <h1 style={{textAlign:'center'}}>Subscription Graph</h1>
          <SubscriptionGraph graph={subscriptionGraph.get()} />
        </div>

      </div>
    );
  }
}

//Example of pagination based on state
function getSubs(props, state) {
  const { pagination: {limitTo} = {}} = state;
  return [{
    subKey: `messages_${limitTo}`,//make key dependent on pagination to trigger resubscription,
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
