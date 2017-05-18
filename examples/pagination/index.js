
import React, {Component} from 'react';
import MobxFirebaseStore, {ObservableSubscriptionGraph} from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

import Graph from 'react-graph-vis';

const apiKey = 'yourApiKey';

const fbApp = firebase.initializeApp({
  apiKey,
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',
  storageBucket: 'testing-3bba1.firebaseio.com'
}, "play");

const fbRef = firebase.database(fbApp).ref();
const store = new MobxFirebaseStore(fbRef);
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

function deferredUnsubscribe(unsubscribe) {
  //optimization to avoid flickering - keep current data for a bit while we wait for new query that includes older items
  return () => setTimeout(() => unsubscribe(), 1000);
}

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
      fetchError: null,
      fetching: false
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

    return deferredUnsubscribe(unsubscribe);
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

    const {writeError, fetchError, value, fetching, pagination: {limitTo}} = this.state;

    const graphVisOptions = {
      layout: {
        hierarchical: true
      },
      edges: {
        color: "#000000"
      }
    };
    const graphVisEvents = {
      select: function(event) {
        const { nodes, edges } = event;
      }
    }

    return (
      <div>
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

        <h1>Subscription Graph</h1>
        <Graph graph={subscriptionGraph.get()} options={graphVisOptions} events={graphVisEvents} />
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
export default createAutoSubscriber({getSubs})(observer(LimitToExample));
