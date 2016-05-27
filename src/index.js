
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

function defaultThrottleConfig() {
    return {
        shouldThrottle: true,
        maxQueueSize: 100,
        queueingTimeMs: 20
    }
}

class CallQueue {
    constructor(config) {
        this.queue = [];
        this.timeout = null;

        config = config || defaultThrottleConfig();
        this.shouldThrottle = config.shouldThrottle;
        this.maxQueueSize = config.maxQueueSize;
        this.queueingTimeMs = config.queueingTimeMs;
    }
    add(call) {
        if (!this.shouldThrottle) {
            //Not throttling, call immediately without queueing
            call();
            return;
        }

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

function createFirebaseSubscriber(store, fb, config) {
    const queue = new CallQueue((config || {}).throttle);

    const {subscribeSubs, subscribedRegistry, unsubscribeAll} = createNestedFirebaseSubscriber({
        onData: function (type, snapshot, sub) {

            function call() {
                //console.log('got value ' + type + ' subKey=' + sub.subKey + ' key=' + snapshot.key() + ' path=' + sub.path + ' #=' + (Object.keys(snapshot.val() || {}).length));
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
            if (store.onSubscribed) {
                function call() {
                    store.onSubscribed(sub);
                }
                queue.add(call);
            }
        },
        onUnsubscribed: (subKey)=> {
            if (store.onUnsubscribed) {
                function call() {
                    store.onUnsubscribed(subKey);
                }
                queue.add(call);
            }
        },
        onWillSubscribe: function (sub) {
            //console.log('Subscribing ' + sub.subKey + ' path=' + sub.path);
            if (store.onWillSubscribe) {
                function call() {
                    store.onWillSubscribe(sub);
                }
                queue.add(call);
            }
        },

        onWillUnsubscribe: function (subKey) {
            //console.log('Unsubscribing ' + subKey + ' ref#=' + subscribedRegistry[subKey].refCount);
            if (store.onWillUnsubscribe) {
                function call() {
                    store.onWillUnsubscribe(subKey);
                }
                queue.add(call);
            }
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

    constructor(fb, config) {
        //data that will be populated directly from firebase
        this.fbStore = map({});

        this.fb = fb; //a Firebase instance pointing to root URL for the app
        const {subscribeSubs, subscribedRegistry, unsubscribeAll} = createFirebaseSubscriber(this, this.fb, config);
        this.subscribeSubs = subscribeSubs;
        this.subscribedRegistry = subscribedRegistry;
        this.unsubscribeAll = unsubscribeAll;
    }

    getData(subKey) {
        return this.fbStore.get(subKey);
    }

    reset() {
        transaction(() => {
            this.unsubscribeAll();
            this.fbStore.clear();
        });
    }
}

export default MobxFirebaseStore;
