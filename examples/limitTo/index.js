
import React, {Component} from 'react';
import MobxFirebaseStore from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

const apiKey = 'AIzaSyDkmd0Vch3_GuwS72sb-IgGsFiDDofSI00';

const fbApp = firebase.initializeApp({
  apiKey,
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',
  storageBucket: 'testing-3bba1.firebaseio.com'
}, "play");

const fbRef = firebase.database(fbApp).ref();
const store = new MobxFirebaseStore(fbRef);

/* Playground, showcases getMore and data entry */

function addItem() {
  return fbRef.child('limitToPlayground').push({text: 'new item'});
}

function deleteItem(key) {
  return fbRef.child('limitToPlayground').child(key).remove();
}

function deleteAll() {
  return fbRef.child('limitToPlayground').remove();
}

const limitTo = 3;

class LimitToExample extends Component {
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.deleteLastItem = this.deleteLastItem.bind(this);
    this.deleteAll = this.deleteAll.bind(this);
    this.getOlder = this.getOlder.bind(this);

    this.state = {
      lastKeyAdded: null,
      startAt: 0,
      pages: [{limitTo}],

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

    return unsubscribe;
  }

  renderItem(key, item) {
    return (
      <div style={{border:'1px grey solid'}} key={key}>
        {key}{':'}{JSON.stringify(item)}
      </div>
    );
  }

  addItem() {
    this.setState({
      writeError: null
    }, () => {
      addItem()
        .then(({key}) => this.setState({lastKeyAdded: key}))
        .catch((error) => this.setState({writeError: error.code}));
    });
  }

  deleteLastItem() {
    const { lastKeyAdded } = this.state;
    if (lastKeyAdded) {
      this.setState({
        writeError: null
      }, () => {
        deleteItem(lastKeyAdded)
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

  getOlder(oldestKey) {
    if (oldestKey) {
      const currentOldestSub = (this.state.pages[0] || {}).endAt;
      if (currentOldestSub !== oldestKey) {
        this.setState({
          pages: [{limitTo, endAt: oldestKey}, ...this.state.pages]
        });
      }
    }
  }

  getPageItems(pageSub) {
    const pageItems = store.getData(pageSub.subKey);

    if (!pageItems) return [];

    //Remove the duplicate last item in page, since it's included in next page
    const items = pageSub.endAt ? pageItems.entries().slice(0, -1) : pageItems.entries();

    console.log('items for ',pageSub.subKey,':',items.map(item=>item[0]))

    return items;
  }

  getFlattenedItems() {
    const { pages } = this.state;
    const pageSubs = getSubsForPages(pages);

    const pagesOfItems = pageSubs.map((pageSub) => this.getPageItems(pageSub));

    //flatten pageItems
    return pagesOfItems.reduce((items, acc) => items.concat(acc), []);
  }

  render() {
    const items = this.getFlattenedItems();

    const apiKeyNeedsUpdating = apiKey == 'yourApiKey';

    const {writeError, fetchError, lastKeyAdded} = this.state;

    const oldestKey = items && items.length > 0 ? items[0][0] : null;

    return (
      <div>
        {apiKeyNeedsUpdating && <h1 style={{color:'red'}}>Replace apiKey in examples/chatFirebase3/chatApp.js with your key</h1>}
        {writeError && <div style={{color:'red'}}>Error writing to firebase: {JSON.stringify(writeError)}</div>}
        {fetchError && <div style={{color:'red'}}>Error fetching data: {JSON.stringify(fetchError)}</div>}
        {!!items && <div>
          Latest {items.length} items:
          {items.map((entry) => this.renderItem(entry[0], entry[1]))}
        </div>
        }
        {lastKeyAdded && <div>Last Key Added: {lastKeyAdded}</div>}
        <button onClick={this.addItem}>Add Item</button>
        <button onClick={this.deleteLastItem}>Delete Last Item</button>
        <button onClick={this.deleteAll}>Delete All</button>
        <br />
        <button onClick={() => this.getOlder(oldestKey)}>Get older</button>
      </div>
    );
  }
}

function getSubsForPages(pages) {
  const res = (pages || []).map(({endAt, limitTo}) => {
    return {
      subKey: `myData_${endAt ? '_'+endAt : ''}_${limitTo}`,//make key dependent on limitTo to trigger resubscription
      endAt,
      limitTo
    };
  });
  return res
}

//Example of pagination and limitTo, based on state
function getSubs(props, state) {
  return getSubsForPages(state.pages)
    .map(({subKey, endAt, limitTo}) => ({
        subKey,
        asList: true,
        resolveFirebaseRef: () =>
          endAt ?
            fbRef.child('limitToPlayground').orderByKey().endAt(endAt).limitToLast(limitTo) :
            fbRef.child('limitToPlayground').limitToLast(limitTo)
      })
    );
}

//Subscribe to and observe firebase data
export default createAutoSubscriber({
    getSubs
})(observer(LimitToExample));
