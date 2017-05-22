
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

function addItem(sortKey) {
  sortKey = sortKey || 0;
  return fbRef.child('limitToPlayground').push({text: 'new item', sortKey});
}

function deleteItem(key) {
  return fbRef.child('limitToPlayground').child(key).remove();
}

function deleteAll() {
  return fbRef.child('limitToPlayground').remove();
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
      writeError: null
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
    const { value } = this.state;
    this.setState({
      writeError: null
    }, () => {
      addItem(parseInt(value))
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
    const subKey = `myData_${limitTo}`;

    let items = store.getData(subKey);

    if (!items && this.state.prevPagination) {
      //optimization to avoid flickering - try to get previous pagination while we're loading older items
      items = store.getData(`myData_${this.state.prevPagination.limitTo}`)
    }

    return items ? items.entries() : [];
  }

  render() {
    const items = this.getItems();

    const apiKeyNeedsUpdating = apiKey == 'yourApiKey';

    const {writeError, _autoSubscriberError: fetchError, value, _autoSubscriberFetching: fetching, pagination: {limitTo}} = this.state;

    return (
      <div>

        <div style={{width:'30%',display:'inline-block'}}>
          {apiKeyNeedsUpdating && <h1 style={{color:'red'}}>Replace apiKey in examples/chatFirebase3/chatApp.js with your key</h1>}
          {writeError && <div style={{color:'red'}}>Error writing to firebase: {JSON.stringify(writeError)}</div>}
          {fetchError && <div style={{color:'red'}}>Error fetching data: {JSON.stringify(fetchError)}</div>}
          <div style={{height: 30}}>{fetching ? 'Loading...' : ''}</div>
          <button onClick={this.addItem}>Add Item</button>
          <input type='number' placeholder='enter sortKey for new item' value={value || ''} onChange={({target:{value}}) => this.setState({value})} />
          {' '}
          <button onClick={this.deleteLastItem}>Delete Last Item</button>
          <button onClick={this.deleteAll}>Delete All</button>
          <br />
          <button onClick={() => this.getOlder()}>Get older</button>

          {!!items && <div>
            Querying for {limitTo} latest items, {items.length} items found:
            {items.map((entry) => this.renderItem(entry[0], entry[1]))}
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

//Example of pagination based on state
function getSubs(props, state) {
  const { pagination: {limitTo} = {}} = state;
  return [{
    subKey: `myData_${limitTo}`,//make key dependent on pagination to trigger resubscription,
    asValue: true, //if using orderBy*, have to get data as value instead of list
    resolveFirebaseRef: () => fbRef.child('limitToPlayground').orderByChild('sortKey').limitToLast(limitTo)
  }];
}

//Subscribe to and observe firebase data
export default createAutoSubscriber({
  getSubs,

  //Returning subscribeSubsWithPromise allows autoSubscriber to track loading status and firebase fetch errors
  subscribeSubs: (subs) => store.subscribeSubsWithPromise(subs)
})(observer(LimitToExample));
