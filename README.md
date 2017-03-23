#### mobx-firebase-store

`MobxFirebaseStore` allows you to subscribe to firebase data via `firebase-nest` subscriptions and have the data flow into `mobx` observable maps.

#### Component Example

```js
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

const store = new MobxFirebaseStore(firebase.database(fbApp).ref());

/* Real-time messages */
class MessageList extends Component {
    renderMessage(messageKey, messageData) {
        return (
          <div style={{border:'1px grey solid'}} key={messageKey}>
              <div>{messageData.text}</div>
              <div>Posted {new Date(messageData.timestamp).toString()}</div>
          </div>
        );
    }
    render() {
        const messages = store.getData('myMsgs'); //'myMsgs' matches the subKey below
        
        //store.getData returns mobx observable map - use keys(), get(), entries(), etc. to render the data
        //do NOT use set() or other mutations on the map -- updates should be written directly to firebase, and will get reflected in the observable map automatically.
        
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
    getSubs: (props, state) => [{
        subKey: 'myMsgs', //any unique string describing this subscription; must match getData call
        asList: true, //or asValue: true. asList will internally subscribe via firebase child_added/removed/changed; asValue via onValue.
        path: 'samplechat/messages', //firebase location,
        
        //Optional - get data callbacks after store data is already updated:
        onData: (type, snapshot) => console.log('got data: ', type, 'myMsgs', snapshot.val())
        
    }], //can add more than one subscription to this array
    subscribeSubs: (subs, props, state) => store.subscribeSubs(subs)
})(observer(MessageList));
```

#### Supports Firebase queries - filtering and sorting

```js
export default createAutoSubscriber({
    getSubs: (props, state) => [{
        subKey: 'myMsgs',
        asValue: true, //have to use asValue if using orderBy* and want to preserve the ordering in the observable map
        resolveFirebaseRef: () => fbRef.child('samplechat/messages').orderByChild('sentTimestamp')
    }],
    subscribeSubs: (subs, props, state) => store.subscribeSubs(subs)
})(observer(MessageList));
```


#### Supports data transformation

With `asValue` sub, define `transformValue : (val) => ...` on the sub.
Or with `asList`, define `transformChild: (val) => ...`.

#### Supports nested subscriptions

For each child, e.g. subscribe to user for each message:

```js
//...
    getSubs: (props, state) => [{
        subKey: 'myMsgs',
        asValue: true,
        resolveFirebaseRef: () => fbRef.child('samplechat/messages'),
        childSubs: (messageKey, messageData) => [{
            subKey: 'user_' + messageData.uid,
            asValue: true,
            resolveFirebaseRef: () => fbRef.child('samplechat/users').child(messageData.uid)
        }] 
    }],
//...
```

Or for specific fields:

```js
    getSubs: (props, state) => {
        return [{
            subKey: 'blog_'+props.blogKey,
            asValue: true,
            resolveFirebaseRef: () => fbRef.child('blogs').child(props.blogKey), 
            fieldSubs: {
                authorKey: (authorKey) => [{subKey: 'user_' + authorKey, asValue: true, path: 'users/' + authorKey}]
            }
        }];
    },
```

#### More examples

[chat](https://github.com/nyura123/mobx-firebase-store/tree/master/examples/chatFirebase3) - includes auth

[next.js example](https://github.com/nyura123/mobx-firebase-store/tree/master/examples/next-example) - server-side rendering with firebase-admin, firebase and mobx, *and auth*

[firebase queries - pagination](https://github.com/nyura123/mobx-firebase-store/tree/master/examples/pagination)


#### Required libs

`npm install mobx mobx-react firebase firebase-nest mobx-firebase-store --save`


# Run examples in storybook

Inspired by react-native-web-starter examples.

1. `cd examples-storybook` or `cd examples-storybook-firebase3`

  To run firebase3 examples, you need to set your API key in index.js.
  You can create one at https://console.cloud.google.com, credentials->create credentials->API key->browser key.

2. `npm install`

3. `npm run storybook`

# Features

1. Firebase 3.x is supported (https://github.com/nyura123/mobx-firebase-store/tree/master/examples/listAndDetailFirebase3)

2. Allows to differentiate between data not being subscribed or loaded (`store.getData(...) === undefined`) vs being empty.

3. Writes to maps are done inside transactions for better performance.
 
4. Throttles writes by default - this helps if we want to avoid re-rendering too frequently, such as during initial load of data.

    To turn off: `const store = new MobxFirebaseStore(fb, {throttle: {shouldThrottle: false}})`.

    Throttling params can also be tweaked.

5. `firebase-nest` subscriptions allow subscribing to whole graphs of data.
    
    For example, via a single subscription, subscribe to `items` and to each `items`'s `category`. If an item is ever deleted or its category is changed, the nested category subscription is deleted/changed automatically. 

6. `store.subscribeSubsWithPromise` provides a promise that resolves when initial data, including nested/child data, is loaded.

7. `MobxFirebaseStore` can be extended to optionally implement various callbacks:

    * `onData(type, snapshot, sub)` -- be notified on every data update coming in from firebase *after* it has already been applied to observable maps. 
    * `onWillSubscribe(sub)`, `onWillUnsubscribe(subKey)`

8. Exposes `subscribedRegistry` which shows how many subscribers are currently listening to each piece of data.

9. `store.reset()` can be used to unsubscribe from all data & reset the store (for example on user logout)

10. Use `firebase-nest` `autoSubscriber` to allow React components to specify their prop- and state-dependent subscriptions and be automatically subscribed/unsubscribed.

    If your component's props or state is updated, the subscriptions will be updated automatically.

11. `firebase-nest` & `autoSubscriber` both minimize unnecessary ref.off()/ref.on() flickering.

12. By default, data is removed from fbStore cache when it no longer has any subscribers.

13. When subscribing `asList`, `onData` with type=`FB_INIT_VAL` gets the whole initial list as one update.

14. Firebase queries are supported via resolveFirebaseRef function you can set on each sub. Otherwise you can set path:
    ```js 
    resolveFirebaseQuery: () => fbRef.child('yourPath')
    ``` 
    or
    ```js 
    path: 'yourPath'
    ```



