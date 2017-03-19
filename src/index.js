
//Utility to maintain nested firebase subscriptions
import createNestedFirebaseSubscriber, {
    FB_INIT_VAL,
    FB_CHILD_ADDED,
    FB_CHILD_REMOVED,
    FB_CHILD_CHANGED } from 'firebase-nest';

import {observable, runInAction} from 'mobx';
const { map } = observable;

export const primitiveKey = '_primitive';


//Firebase 3.x: snapshot.key() has been replaced with snapshot.key
let getKey = function(snapshot) {
    if (typeof snapshot.key == 'function') {
        console.log("mobx-firebase-store: detected pre-3.x firebase snapshot.key()");
        getKey = legacyGetKey;
        return legacyGetKey(snapshot);
    }
    console.log("mobx-firebase-store: detected ^3.x firebase snapshot.key");
    getKey = newGetKey;
    return newGetKey(snapshot);
};
function legacyGetKey(snapshot) {
    return snapshot.key();
}
function newGetKey(snapshot) {
    return snapshot.key;
}

function setData(fbStore, sub, snapshot) {
    runInAction(() => {
        let m = fbStore.get(sub.subKey);
        if (!m) {
            m = map({});
            fbStore.set(sub.subKey, m);
        }

        m.clear();

        const val = snapshot.val();

        //Support primitive values by wrapping them in an object
        if (val !== null && typeof val !== 'object') {
            m.merge({[primitiveKey]: val});
        } else {
            //Use snapshot.forEach to preserve any ordering.
            //mobx observable map preserves insertion ordering in its keys(), entries() getters
            snapshot.forEach((child) => {
                m.set(getKey(child), child.val());
            });
        }
    });
}

function setChild(fbStore, sub, key, val) {
    runInAction(() => {
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
        runInAction(() => {
            (queue || []).forEach(call => call());
        });
    }
}

function createFirebaseSubscriber(store, fb, config) {
    const queue = new CallQueue((config || {}).throttle);

    const {subscribeSubs, subscribedRegistry, unsubscribeAll, subscribeSubsWithPromise} = createNestedFirebaseSubscriber({
        onData: function (type, snapshot, sub) {

            function call() {
                //console.log('got value ' + type + ' subKey=' + sub.subKey + ' key=' + getKey(snapshot) + ' path=' + sub.path + ' #=' + (Object.keys(snapshot.val() || {}).length));
                const fbStore = store.fbStore;

                if (sub.asValue) {
                    setData(fbStore, sub, snapshot);
                } else if (sub.asList) {
                    switch (type) {
                        case FB_INIT_VAL:
                            setData(fbStore, sub, snapshot);
                            break;
                        case FB_CHILD_ADDED:
                        case FB_CHILD_CHANGED:
                            setChild(fbStore, sub, getKey(snapshot), snapshot.val());
                            break;
                        case FB_CHILD_REMOVED:
                            setChild(fbStore, sub, getKey(snapshot), null);
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
                queue.add(() => store.onSubscribed(sub));
            }
        },
        onUnsubscribed: (subKey)=> {
            if (store.onUnsubscribed) {
                queue.add(() => store.onUnsubscribed(subKey));
            }
        },
        onWillSubscribe: function (sub) {
            //console.log('Subscribing ' + sub.subKey + ' path=' + sub.path);
            if (store.onWillSubscribe) {
                queue.add(() => store.onWillSubscribe(sub));
            }
        },

        onWillUnsubscribe: function (subKey) {
            //console.log('Unsubscribing ' + subKey + ' ref#=' + subscribedRegistry[subKey].refCount);
            if (store.onWillUnsubscribe) {
                queue.add(() => store.onWillUnsubscribe(subKey));
            }
        },

        resolveFirebaseQuery: function (sub) {
            if (store.resolveFirebaseQuery) {
                return store.resolveFirebaseQuery(sub);
            }

            if (!sub || (!sub.path && !sub.resolveFirebaseRef)) {
                console.error('mobx-firebase-store expects each sub to have a path or resolveFirebaseRef: '+sub.subKey);
            }

            return sub.resolveFirebaseRef ? sub.resolveFirebaseRef() : fb.child(sub.path);
        }
    });

    return {queue, subscribeSubs, subscribedRegistry, unsubscribeAll, subscribeSubsWithPromise};
}

class MobxFirebaseStore {
    //TODO dependency injection of mobx & firebase-nest?

    constructor(fb, config) {
        //data that will be populated directly from firebase
        this.fbStore = map({});

        this.fb = fb; //a Firebase instance pointing to root URL for the app
        const {queue, subscribeSubs, subscribedRegistry, unsubscribeAll, subscribeSubsWithPromise}
            = createFirebaseSubscriber(this, this.fb, config);
        this.queue = queue;
        this.subscribeSubs = subscribeSubs;
        this.subscribedRegistry = subscribedRegistry;
        this.unsubscribeAll = unsubscribeAll;
        this.rawSubscribeSubsWithPromie = subscribeSubsWithPromise;
    }

    subscribeSubsWithPromise(subs) {
        const {unsubscribe, promise } = this.rawSubscribeSubsWithPromie(subs);

        //Put resolve/reject on the queue to make sure it is seen after queued up onData callbacks
        const queuedResolvePromise = new Promise((resolve, reject) => {
            promise.then((subKey) => {
                this.queue.add(() => resolve(subKey));
            }, (error) => {
                this.queue.add(() => reject(error));
            });
        });

        return {
            unsubscribe,
            promise: queuedResolvePromise
        }
    }

    getData(subKey) {
        return this.fbStore.get(subKey);
    }

    reset() {
        this.queue.add(() => {
            this.unsubscribeAll();
            this.fbStore.clear();
        });
    }

    onUnsubscribed(subKey) {
        //Default implementation: remove data when it no longer has any subscribers

        if (!this.subscribedRegistry[subKey]) {
            this.fbStore.delete(subKey);
        }
    }
}

export default MobxFirebaseStore;
