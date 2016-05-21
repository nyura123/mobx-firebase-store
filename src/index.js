
//Utility to maintain nested firebase subscriptions
import createNestedFirebaseSubscriber, {
    FB_INIT_VAL,
    FB_CHILD_ADDED,
    FB_CHILD_REMOVED,
    FB_CHILD_CHANGED } from 'firebase-nest';

import {map, transaction} from 'mobx';

export const primitiveKey = '_primitive';

function setData(fbStore, sub, key, val) {
    transaction(() => {
        if (!fbStore.get(sub.subKey)) {
            fbStore.set(sub.subKey, map({}));
        }
        fbStore.get(sub.subKey).clear();

        //Support primitive values by wrapping them in an object
        if (val !== null && typeof val !== 'object') {
            val = {[primitiveKey]: val};
        }

        fbStore.get(sub.subKey).merge(val || {});
    });
}

function setChild(fbStore, sub, key, val) {
    transaction(() => {
        const record = fbStore.get(sub.subKey);
        if (!record) {
            //TODO error
            console.error('Can\'t find record for ' + sub.subKey);
            return;
        }
        if (val !== null && val !== undefined) {
            record.set(key, val);
        } else {
            record.delete(key);
        }
    });
}

class CallQueue {
    constructor() {
        this.queue = [];
        this.timeout = null;
        this.maxQueueSize = 100;
        this.queueingTimeMs = 20;
    }
    add(call) {
        if (this.queue.length > this.maxQueueSize ) {
            this.drain();
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.queue.push(call);
        this.timeout = setTimeout(() => {
            this.drain();
        }, this.queueingTimeMs);
    }
    drain() {
        const queue = this.queue.slice(0);
        this.queue = [];
        transaction(() => {
            (queue || []).forEach(call => call());
        });
    }
}

function createFirebaseSubscriber(store, fb) {
    const queue = new CallQueue();

    const {subscribeSubs, subscribedRegistry, unsubscribeAll} = createNestedFirebaseSubscriber({
        onData: function (type, snapshot, sub) {

            function call() {
                //console.log('got value ' + type + ' subKey=' + sub.subKey + ' path=' + sub.path + ' #=' + (Object.keys(snapshot.val() || {}).length));
                const fbStore = store.fbStore;

                if (sub.asValue) {
                    setData(fbStore, sub, snapshot.key(), snapshot.val());
                } else if (sub.asList) {
                    switch (type) {
                        case FB_INIT_VAL:
                            setData(fbStore, sub, snapshot.key(), snapshot.val());
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
            }

            queue.add(call);
        },
        onSubscribed: (sub)=> {
            function call() {
                if (store.onSubscribed) {
                    store.onSubscribed(sub);
                }
            }
            queue.add(call);
        },
        onUnsubscribed: (subKey)=> {
            function call() {
                if (store.onUnsubscribed) {
                    store.onUnsubscribed(subKey);
                }
            }
            queue.add(call);
        },
        onWillSubscribe: function (sub) {
            //console.log('Subscribing ' + sub.subKey + ' path=' + sub.path);
            function call() {
                if (store.onWillSubscribe) {
                    store.onWillSubscribe(sub);
                }
            }
            queue.add(call);
        },

        onWillUnsubscribe: function (subKey) {
            //console.log('Unsubscribing ' + subKey + ' ref#=' + subscribedRegistry[subKey].refCount);
            function call() {
                if (store.onWillUnsubscribe) {
                    store.onWillUnsubscribe(subKey);
                }
            }
            queue.add(call);
        },

        resolveFirebaseQuery: function (sub) {
            if (!sub.path) {
                console.error("mobx-firebase-store expects each sub to have a path: "+sub.subKey);
            }

            if (store.resolveFirebaseQuery) {
                return store.resolveFirebaseQuery(sub);
            }
            return fb.child(sub.path);
        }
    });

    return {subscribeSubs, subscribedRegistry, unsubscribeAll};
}

class MobxFirebaseStore {
    //TODO dependency injection of mobx & firebase-nest?

    constructor(fb) {
        //data that will be populated directly from firebase
        this.fbStore = map({});

        this.fb = fb; //a Firebase instance pointing to root URL for the app
        const {subscribeSubs, subscribedRegistry, unsubscribeAll} = createFirebaseSubscriber(this, this.fb);
        this.subscribeSubs = subscribeSubs;
        this.subscribedRegistry = subscribedRegistry;
        this.unsubscribeAll = unsubscribeAll;

        //Publish stream of firebase events to interested parties
        this.nextEventSubscriberId = 1;
        this.eventSubscribers = {};
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
