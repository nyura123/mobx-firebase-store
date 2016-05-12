
//Utility to maintain nested firebase subscriptions
import createNestedFirebaseSubscriber, {
    FB_INIT_VAL,
    FB_CHILD_ADDED,
    FB_CHILD_REMOVED,
    FB_CHILD_CHANGED } from 'firebase-nest';

import {map, transaction} from 'mobx';

function setData(fbStore, sub, val) {
    transaction(() => {
        if (!fbStore.get(sub.subKey)) {
            fbStore.set(sub.subKey, map({}));
        }
        fbStore.get(sub.subKey).clear();
        fbStore.get(sub.subKey).merge(val || {});
    })
}

function setChild(fbStore, sub, key, val) {
    transaction(() => {
        const record = fbStore.get(sub.subKey);
        if (!record) {
            //TODO error
            console.error('Can\'t find record for ' + sub.subKey);
            return;
        }
        if (val !== null && val !== undefined)
            record.set(key, val);
        else {
            record.delete(key);
        }
    })
}

function createFirebaseSubscriber(store, fb) {
    const {subscribeSubs, subscribedRegistry} = createNestedFirebaseSubscriber({
        onData: function (type, snapshot, sub) {
            //console.log('got value ' + type + ' subKey=' + sub.subKey + ' path=' + sub.path + ' #=' + (Object.keys(snapshot.val() || {}).length));

            const fbStore = store.fbStore;

            store.fetchStatus.isFetching.delete(sub.subKey);

            if (sub.asValue) {
                setData(fbStore, sub, snapshot.val());
            } else if (sub.asList) {
                switch (type) {
                    case FB_INIT_VAL:
                        setData(fbStore, sub, snapshot.val());
                        break;
                    case FB_CHILD_ADDED:
                    case FB_CHILD_CHANGED:
                        setChild(fbStore, sub, snapshot.key(), snapshot.val());
                        break;
                    case FB_CHILD_REMOVED:
                        setChild(fbStore, sub, snapshot.key(), null);
                        break;
                }
            } else {
                //TODO error
                console.error('sub.asValue or sub.asList must be true');
                console.error(sub);
            }

            if (store.onData) {
                //Allow store to also react to data, for animations, snackbars, etc.
                store.onData(type, snapshot, sub);
            }
        },
        onSubscribed: (sub)=> {
            if (store.onSubscribed) {
                store.onSubscribed(sub);
            }
        },
        onUnsubscribed: (subKey)=> {
            if (store.onUnsubscribed) {
                store.onUnsubscribed(subKey);
            }
        },
        onWillSubscribe: function (sub) {
            //console.log('Subscribing ' + sub.subKey + ' path=' + sub.path);
            if (!subscribedRegistry[sub.subKey]) {
                store.fetchStatus.isFetching.set(sub.subKey, true);
            }

            if (store.onWillSubscribe) {
                store.onWillSubscribe(sub);
            }
        },

        /* Remove data that is about to be unsubscribed since no one needs it! */
        onWillUnsubscribe: function (subKey) {
            //console.log('Unsubscribing ' + subKey + ' ref#=' + subscribedRegistry[subKey].refCount);
            if (subscribedRegistry[subKey].refCount <= 1) {
                store.fbStore.delete(subKey);
                store.fetchStatus.isFetching.delete(subKey);
            }

            if (store.onWillUnsubscribe) {
                store.onWillUnsubscribe(subKey);
            }
        },

        resolveFirebaseQuery: function (sub) {
            if (store.resolveFirebaseQuery) {
                return store.resolveFirebaseQuery(sub);
            }
            return fb.child(sub.path);
        }
    });

    return {subscribeSubs, subscribedRegistry};
}

class MobxFirebaseStore {
    //TODO dependency injection of mobx & firebase-nest?

    constructor(fb) {
        //data that will be populated directly from firebase
        this.fbStore = map({});

        this.fetchStatus = {
            isFetching: map({}),
            fetchError: map({})
        };

        this.fb = fb; //a Firebase instance pointing to root URL for the app
        const {subscribeSubs, subscribedRegistry} = createFirebaseSubscriber(this, this.fb);
        this.subscribeSubs = subscribeSubs;
        this.subscribedRegistry = subscribedRegistry;

        //Publish stream of firebase events to interested parties
        this.nextEventSubscriberId = 1;
        this.eventSubscribers = {};
    }

    reset() {
        //TODO check if anyone's still subscribed...
        //this.fbStore.keys().forEach(subKey => {
        //    //clear data that no one is subscribed to...
        //    if (!this.subscribedRegistry[subKey]) {
        //        this.fbStore.get(subKey).clear();
        //    }
        //}
        this.fbStore.clear();
        this.fetchStatus.isFetching.clear();
        this.fetchStatus.fetchError.clear();
    }

    isFetching(subKey) {
        return (!subKey? this.fetchStatus.isFetching.size > 0 : !!this.fetchStatus.isFetching.get(subKey));
    }
    isFetchError() {
        return this.fetchStatus.fetchError.size > 0;
    }

    subscribeToFirebaseEvents(cb) {
        const subId = this.nextEventSubscriberId++;
        this.eventSubscribers[subId] = cb;
        const self = this;
        return function unsubscribe() {
            delete self.eventSubscribers[subId];
        }
    }
    publishFirebaseEvent(what) {
        Object.keys(this.eventSubscribers || {}).forEach(subId => {
            const cb = this.eventSubscribers[subId];
            cb(what);
        });
    }
    onData(type, snapshot, sub) {
        this.publishFirebaseEvent({type: 'onData', payload: {type, snapshot, sub}});
    }
    onWillSubscribe(sub) {
        this.publishFirebaseEvent({type: 'onWillSubscribe', payload: {sub}});
    }
    onWillUnsubscribe(subKey) {
        this.publishFirebaseEvent({type: 'onWillUnsubscribe', payload: {subKey}});
    }
    onSubscribed(sub) {
        this.publishFirebaseEvent({type: 'onSubscribed', payload: {sub}});
    }
    onUnsubscribed(subKey) {
        this.publishFirebaseEvent({type: 'onUnsubscribed', payload: {subKey}});
    }
}

export default MobxFirebaseStore;