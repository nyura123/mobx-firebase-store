
import MobxFirebaseStore, {primitiveKey} from '../src/index';

import setupFirebase from './mockFirebaseSetup';
import FirebaseServer from 'firebase-server';
import {autorun} from 'mobx';
import expect from 'expect';

const PORT = 45003;

describe('MobxFirebaseStore', () => {
    let store, fb, server, mockery, disposer;

    beforeEach(() => {
        mockery = setupFirebase();
        const Firebase = require('firebase');
        server = new FirebaseServer(PORT, 'localhost:' + PORT);
        fb = new Firebase('ws://dummy0.firebaseio.test:' + PORT+'/test');
        store = new MobxFirebaseStore(fb);
    });

    afterEach(function() {
        if (server) {
            server.close();
            server = null;
        }
        fb.set(null);
        if (disposer) {
            disposer();
            disposer = null;
        }
        mockery.deregisterMock('faye-websocket');
    });

    it('gets created ok', () => {
        expect(store).toNotBe(undefined);
        expect(store.fb).toBe(fb);
    });

    it('allows to subscribe and receive empty data as value', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'data',
            asValue: true,
            path: 'data'
        }]);
        disposer = autorun(() => {
            const data = store.fbStore.get('data');
            if (data) {
                expect(data.entries()).toEqual([]);
                unsub();
                done();
            }
        });
    });


    it('allows to subscribe and receive empty data as list', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'data',
            asList: true,
            path: 'data'
        }]);
        disposer = autorun(() => {
            const data = store.fbStore.get('data');
            if (data) {
                expect(data.entries()).toEqual([]);
                unsub();
                done();
            }
        });
    });

    it('allows to subscribe and receive data as value', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'data',
            asValue: true,
            path: 'data'
        }]);

        const data = {
            field1: 'val1',
            field2: 'val2'
        };
        fb.child('data').set(data);

        disposer = autorun(() => {
            const data = store.fbStore.get('data');
            if (data) {
                expect(data.entries()).toEqual([['field1', 'val1'], ['field2', 'val2']]);
                unsub();
                done();
            }
        });
    });


    it('allows to subscribe and receive data as list', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'data',
            asList: true,
            path: 'data'
        }]);

        const data = {
            field1: 'val1',
            field2: 'val2'
        };
        fb.child('data').set(data);

        disposer = autorun(() => {
            const data = store.fbStore.get('data');
            if (data) {
                expect(data.entries()).toEqual([['field1', 'val1'], ['field2', 'val2']]);
                unsub();
                done();
            }
        });
    });

    it('allows to subscribe as value and subscribe to children', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'list',
            asValue: true,
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
            const list = store.fbStore.get('list');
            const child1Data = store.fbStore.get('child_child1');
            const child2Data = store.fbStore.get('child_child2');
            if (list && child1Data && child2Data) {
                expect(list.entries()).toEqual([['child1', 1], ['child2', 1]]);
                expect(child1Data.entries()).toEqual([[primitiveKey, 'child1Detail']]);
                expect(child2Data.entries()).toEqual([[primitiveKey, 'child2Detail']]);
                unsub();
                done();
            }
        });
    });

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
            const list = store.fbStore.get('list');
            const child1Data = store.fbStore.get('child_child1');
            const child2Data = store.fbStore.get('child_child2');
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
            const orderItem1 = store.fbStore.get('orderItem1');
            const user1Data = store.fbStore.get('users_user1');
            const product51Data = store.fbStore.get('products_product51');
            if (orderItem1 && user1Data && product51Data) {
                expect(orderItem1.entries()).toEqual([['productKey', 'product51'], ['userKey', 'user1']]);
                expect(user1Data.entries()).toEqual([[primitiveKey, 'user1 Detail']]);
                expect(product51Data.entries()).toEqual([['category', 'ufo'], ['name', 'product51']]);
                unsub();
                done();
            }
        });
    });
});