
//Utility to maintain nested firebase subscriptions
import createNestedFirebaseSubscriber, {
    FB_INIT_VAL,
    FB_CHILD_ADDED,
    FB_CHILD_REMOVED,
    FB_CHILD_CHANGED,
    asNodesAndEdges
} from 'firebase-nest';

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

        const oldVal = snapshot.val();
        const newVal = sub.transformValue ? sub.transformValue(oldVal) : oldVal;
        const val = newVal;
        const valTransformed = oldVal !== newVal;

        //Support primitive values by wrapping them in an object
        if (val !== null && typeof val !== 'object') {
            m.merge({[primitiveKey]: val});
        } else {
            if (valTransformed) {
                m.merge(val);
            } else {
                //Use snapshot.forEach to preserve any ordering.
                //mobx observable map preserves insertion ordering in its keys(), entries() getters

                snapshot.forEach((child) => {
                    const childVal = child.val();
                    const newChildVal = sub.transformChild ? sub.transformChild(childVal) : childVal;
                    m.set(getKey(child), newChildVal);
                });
            }
        }
    });
}

function setChild(fbStore, sub, snapshot) {
    runInAction(() => {
        const record = fbStore.get(sub.subKey);
        if (!record) {
            //TODO error
            console.error('[mobx-firebase-store] setChild: ', sub, 'Can\'t find record for ' + sub.subKey);
            return;
        }
        
        const oldVal = snapshot.val();
        const newVal = sub.transformChild ? sub.transformChild(oldVal) : oldVal;
        
        record.set(getKey(snapshot), newVal);
    });
}

function removeChild(fbStore, sub, key) {
    runInAction(() => {
        const record = fbStore.get(sub.subKey);
        if (!record) {
            //TODO error
            console.error('[mobx-firebase-store] removeChild: ', sub, 'Can\'t find record for ' + sub.subKey);
            return;
        }

        record.delete(key);
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

function validateTransforms(sub) {
    if (sub.transformChild && sub.transformValue) {
        console.error('[mobx-firebase-store] cannot use transformChild and transformValue together; use transformChild with asList, transformValue or transformChild with asValue', sub)
    }
    else if (sub.asList && sub.transformValue) {
        console.error('[mobx-firebase-store] should not use transformValue with asList, use transformChild', sub);
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
                            setChild(fbStore, sub, snapshot);
                            break;
                        case FB_CHILD_REMOVED:
                            removeChild(fbStore, sub, getKey(snapshot));
                            break;
                    }
                } else {
                    //TODO error
                    console.error('[mobx-firebase-store] sub.asValue or sub.asList must be true');
                    console.error(sub);
                }

                validateTransforms(sub);

                const callback = sub.onData || (store.onData ? store.onData.bind(store) : null);
                if (callback) {
                    //Allow to react to data, for animations, snackbars, etc.
                    runInAction(() => callback(type, snapshot, sub));
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
                console.error('mobx-firebase-store] expects each sub to have a path or resolveFirebaseRef: '+sub.subKey);
            }

            return sub.resolveFirebaseRef ? sub.resolveFirebaseRef() : fb.child(sub.path);
        }
    });

    return {queue, subscribeSubs, subscribedRegistry, unsubscribeAll, subscribeSubsWithPromise};
}

function maybeDelayedUnsubscribe(unsubscribe, delayMs) {
    if (!delayMs) return unsubscribe;

    //New unsubscribe function that unsubscribes after a timeout
    return () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                unsubscribe();
                resolve();
            }, delayMs);
        });
    }
}

class MobxFirebaseStore {
    //TODO dependency injection of mobx & firebase-nest?

    constructor(fb, config) {
        //data that will be populated directly from firebase
        this.fbStore = map({});

        this.unsubscribeDelayMs = (config || {}).unsubscribeDelayMs || 0;

        this.fb = fb; //a Firebase instance pointing to root URL for the app
        const {queue, subscribeSubs, subscribedRegistry, unsubscribeAll, subscribeSubsWithPromise}
            = createFirebaseSubscriber(this, this.fb, config);
        this.queue = queue;
        this.rawSubscribeSubs = subscribeSubs;
        this.rawSubscribeSubsWithPromise = subscribeSubsWithPromise;
        this.subscribeSubs = this.subscribeSubs.bind(this);
        this.subscribeSubsWithPromise = this.subscribeSubsWithPromise.bind(this);
        this.subscribedRegistry = subscribedRegistry;
        this.unsubscribeAll = unsubscribeAll;
    }

    subscribeSubs(subs) {
        return maybeDelayedUnsubscribe(this.rawSubscribeSubs(subs), this.unsubscribeDelayMs);
    }

    subscribeSubsWithPromise(subs) {
        const {unsubscribe, promise } = this.rawSubscribeSubsWithPromise(subs);

        //Put resolve/reject on the queue to make sure it is seen after queued-up onData callbacks
        const queuedResolvePromise = new Promise((resolve, reject) => {
            promise.then((subKey) => {
                this.queue.add(() => resolve(subKey));
            }, (error) => {
                this.queue.add(() => reject(error));
            });
        });

        return {
            unsubscribe: maybeDelayedUnsubscribe(unsubscribe, this.unsubscribeDelayMs),
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

    resetFromData(data) {
        this.fbStore.clear();
        Object.keys(data || {}).forEach((subKey) => {
            let obsVal;
            let val = data[subKey];
            if (val !== null) {
                if (Array.isArray(val)) {
                    obsVal = observable.array(val);
                }
                else if (typeof val !== 'object') {
                    obsVal = observable.map({[primitiveKey]: val});
                } else {
                    obsVal = observable.map(val);
                }
            }
            this.fbStore.set(subKey, obsVal);
        });
    }
    
    toJS() {
        return this.fbStore.toJS();
    }

    onSubscribed(sub) {
        if (this.observableSubscriptionGraph) {
            this.observableSubscriptionGraph.update();
        }
    }

    onUnsubscribed(subKey) {
        //Default implementation: remove data when it no longer has any subscribers

        if (!this.subscribedRegistry[subKey]) {
            this.fbStore.delete(subKey);
        }

        if (this.observableSubscriptionGraph) {
            this.observableSubscriptionGraph.update();
        }
    }

    attachObservableSubscriptionGraph(graph) {
        this.observableSubscriptionGraph = graph;
    }

    getSubscribedRegistry() {
        return this.subscribedRegistry;
    }
}

export class ObservableSubscriptionGraph {
    constructor(store, makeNodeProps) {
        this.store = store;
        this.obsGraph = observable({
            nodes: [],
            edges: []
        });

        this.makeNodeProps = makeNodeProps;

        store.attachObservableSubscriptionGraph(this);
    }

    //to be called by MobxFirebaseStore internally
    update() {
        const graph = asNodesAndEdges(this.store.getSubscribedRegistry(), this.makeNodeProps);
        this.obsGraph.nodes.replace(graph.nodes);
        this.obsGraph.edges.replace(graph.edges);
    }

    get() {
        return {
            nodes: this.obsGraph.nodes.slice(),
            edges: this.obsGraph.edges.slice()
        }
    }
}

export default MobxFirebaseStore;
