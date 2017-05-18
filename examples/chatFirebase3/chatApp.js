
import React, {Component} from 'react';
import MobxFirebaseStore, { ObservableSubscriptionGraph } from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {createAutoSubscriber} from 'firebase-nest';
import firebase from 'firebase';

// import {extras} from 'mobx';
import Graph from 'react-graph-vis';

//
// class MobxGraphMaker {
//   constructor(mobxNode) {
//    this.nextNodeId = 1;
//     this.allNodes = [];
//     this.allEdges = []
//     this.build(mobxNode);
//   }
//
//   getGraph() {
//     return {
//       nodes: this.allNodes,
//       edges: this.allEdges
//     }
//   }
//
//   //private
//   build(mobxNode, parentGraphNode = null) {
//     const graphNode = {id: this.nextNodeId++, label: mobxNode.name};
//     this.allNodes.push(graphNode);
//     parentGraphNode && this.allEdges.push({from: graphNode.id, to: parentGraphNode.id});
//     (mobxNode.dependencies || []).forEach((mobxDep) => this.build(mobxDep, graphNode));
//   }
// }

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
const subscriptionGraph = new ObservableSubscriptionGraph(store);
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

  subscribeSubs(subs, props, state) {
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
    const { fetching, fetchError } = this.state;

    //const graph = new MobxGraphMaker(extras.getDependencyTree(this.render.$mobx)).getGraph();

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
        <h1><RegisterOrLogin authStore={authStore} /></h1>
        {apiKeyNeedsUpdating && <h1 style={{color:'red'}}>Replace apiKey in examples/chatFirebase3/chatApp.js with your key</h1>}
        {fetching && <div>Fetching</div>}
        {fetchError && <div>{fetchError}</div>}
        {!!messages && <div>
          Messages:
          {messages.keys().map(messageKey => this.renderMessage(messageKey, messages.get(messageKey)))}
        </div>
        }

        <h1>Subscription Graph</h1>
        <Graph style={{width:'100%', height:400}} graph={subscriptionGraph.get()} options={graphVisOptions} events={graphVisEvents} />
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

    //Using more advanced subscribeSubs option in MessageList
    //subscribeSubs: (subs) => store.subscribeSubs(subs)
})(observer(MessageList));
