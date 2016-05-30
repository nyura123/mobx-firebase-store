#### mobx-firebase-store

`MobxFirebaseStore` allows you to subscribe to firebase data via `firebase-nest` subscriptions and have the data flow into `mobx` observable maps.


#### Features

1. Allows to differentiate between data not being subscribed or loaded (`store.getData(...) === undefined`) vs being empty.

2. Writes to maps are done inside transactions for better performance.
 
3. Throttles writes by default - this helps if we want to avoid re-rendering too frequently, such as during initial load of data.

 To turn off: `const store = new MobxFirebaseStore(fb, {throttle: {shouldThrottle: false}})`.

 Throttling params can also be tweaked.

4. `firebase-nest` subscriptions support specifying how to subscribe to child data/fields.

5. `MobxFirebaseStore` can be extended to optionally implement various callbacks:

 * `onData(type, snapshot, sub)` -- be notified on every data update coming in from firebase *after* it has already been applied to observable maps. 
 * `resolveFirebaseQuery(sub)` -- can implement Firebase queries such as `orderByChild`, `limitToLast`, `startAt`, `endAt`
 * `onWillSubscribe(sub)`, `onWillUnsubscribe(subKey)`

6. Exposes `subscribedRegistry` which shows how many subscribers are currently listening to each piece of data.

7. `store.reset()` can be used to unsubscribe from all data & reset the store (for example on user logout)

8. Use `firebase-nest` `autoSubscriber` to allow React components to specify their prop- and state-dependent subscriptions and be automatically subscribed/unsubscribed.

9. `firebase-nest` & `autoSubscriber` both minimize unnecessary ref.off()/ref.on() flickering.

10. By default, data is removed from fbStore cache when it no longer has any subscribers.

11. When subscribing `asList`, `onData` with type=`FB_INIT_VAL` gets the whole initial list as one update.


#### Install libs

`npm install mobx mobx-react firebase firebase-nest mobx-firebase-store --save`


#### Basic Example

```
import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import MobxFirebaseStore from 'mobx-firebase-store';
import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';
import Firebase from 'firebase';

const store = new MobxFirebaseStore(
    new Firebase("https://docs-examples.firebaseio.com")
)

/*
    Display messages and users for each message
 */
class MessageList extends Component {
    //implement getSubs and subscribeSubs for autoSubscriber: subscribe to messages and user for each message
    static getSubs(props, state) {
        return [{
            subKey: 'messages',
            asList: true,
            forEachChild: {
                childSubs: (childKey, childVal) => {
                    return [{
                        subKey: "user_"+childVal.uid,
                        asValue: true,

                        path: "samplechat/users/"+childVal.uid
                    }]
                }

            },

            path: 'samplechat/messages'
        }];
    }
    static subscribeSubs(subs, props, state) {
        return props.store.subscribeSubs(subs);
    }

    renderMessage(messageKey, messageData) {
        const user = this.props.store.getData('user_'+messageData.uid);
        const userName = user ? user.get('name') : null;

        return (
          <div style={{border:'1px grey solid'}} key={messageKey}>
              <div>{messageData.text}</div>
              <div>Posted {new Date(messageData.timestamp).toString()}</div>
              {userName && <div>By {userName.first || ''}{' '}{userName.last || ''}</div>}
          </div>
        );
    }
    render() {
        const messages = this.props.store.getData('messages');
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
MessageList = autoSubscriber(observer(MessageList));


ReactDOM.render(<MessageList store={store}/>, document.getElementById('app'));
```

#### Example of a React component that subscribes to Firebase and gets data from MobxFirebaseStore:

https://github.com/nyura123/mobx-firebase-store/tree/master/examples/listAndDetail

1. cd examples/listAndDetail
2. npm install
3. webpack
4. open index.html

#### More Examples Taken From Tests

Subscribe to a Firebase path and specify how to subscribe to each child or field under that path (something like a data join). 
Data flows into the store and gets stored under `subKey`'s specified in the subscriptions.


```
const fb = new Firebase('https://your-firebase-instance');
const store = new MobxFirebaseStore(fb);
import { autorun } from 'mobx';

it('allows to subscribe as list and subscribe to children', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'list',
            asList: true,
            forEachChild: {
                childSubs: (childKey, childVal) => {
                    return [{subKey:'child_'+childKey, asValue:true, path: 'details/'+childKey}]
                }
            },
            path: 'list'
        }]);

        const list = {
            child1: 1,
            child2: 1
        };
        const details = {
            child1: 'child1Detail',
            child2: 'child2Detail'
        };
        fb.child('list').set(list);
        fb.child('details').set(details);

        disposer = autorun(() => {
            const list = store.getData('list');
            const child1Data = store.getData('child_child1');
            const child2Data = store.getData('child_child2');
            if (list && child1Data && child2Data) {
                expect(list.entries()).toEqual([['child1', 1], ['child2', 1]]);
                expect(child1Data.entries()).toEqual([[primitiveKey, 'child1Detail']]);
                expect(child2Data.entries()).toEqual([[primitiveKey, 'child2Detail']]);
                unsub();
                done();
            }
        });
    });

    it('allows to subscribe as value and subscribe to fields', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'orderItem1',
            asValue: true,
            forFields: [{
                fieldKey: 'userKey',
                fieldSubs: (fieldVal) => {
                    expect(fieldVal).toEqual("user1");
                    return [{subKey: 'users_' + fieldVal, asValue: true, path: 'users/' + fieldVal}];
                }
            }, {
                fieldKey: 'productKey',
                fieldSubs: (fieldVal) => {
                    expect(fieldVal).toEqual("product51");
                    return [{subKey: 'products_' + fieldVal, asValue: true, path: 'products/' + fieldVal}];
                }
            }],
            path: 'orderItem1'
        }]);

        const orderItem1 = {
            productKey: 'product51',
            userKey: 'user1'
        };
        const users = {
            user1: 'user1 Detail'
        };
        const products = {
            product51: {
                name: 'product51',
                category: 'ufo'
            }
        };
        fb.child('orderItem1').set(orderItem1);
        fb.child('users').set(users);
        fb.child('products').set(products);

        disposer = autorun(() => {
            const orderItem1 = store.getData('orderItem1');
            const user1Data = store.getData('users_user1');
            const product51Data = store.getData('products_product51');
            if (orderItem1 && user1Data && product51Data) {
                expect(orderItem1.entries()).toEqual([['productKey', 'product51'], ['userKey', 'user1']]);
                expect(user1Data.entries()).toEqual([[primitiveKey, 'user1 Detail']]);
                expect(product51Data.entries()).toEqual([['category', 'ufo'], ['name', 'product51']]);
                unsub();
                done();
            }
        });
    });
    
```



