
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
        fb.set(null);
        if (server) {
            server.close();
            server = null;
        }
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
            const data = store.getData('data');
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
            const data = store.getData('data');
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
            const data = store.getData('data');
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
            const data = store.getData('data');
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


    it('allows to subscribe to children in another store', (done) => {

        const userStore = new MobxFirebaseStore(fb);

        const unsub = store.subscribeSubs([{
            subKey: 'list',
            asList: true,
            forEachChild: {
                store: userStore,
                childSubs: (childKey, arg1, arg2, childVal) => {
                    expect(arg1).toBe('arg1');
                    expect(arg2).toBe('arg2');
                    return [{
                        subKey:'user_'+childKey,
                        asValue:true,
                        path: 'users/'+childKey
                    }]
                },
                args: ['arg1', 'arg2'] //just to show that childVal is the last arg passed to childSubs
            },
            path: 'list'
        }]);

        const list = {
            user1: 1,
            user2: 1
        };

        const users = {
            user1: {
                name: "name1"
            },
            user2: {
                name: "name2"
            }
        };

        fb.child('list').set(list);
        fb.child('users').set(users);

        disposer = autorun(() => {
            const list = store.getData('list');

            //Users got stored in the userStore
            const user1 = userStore.getData('user_user1');
            const user2 = userStore.getData('user_user2');

            if (list && user1 && user2) {
                expect(list.entries()).toEqual([['user1', 1], ['user2', 1]]);
                expect(user1.entries()).toEqual([['name', 'name1']]);
                expect(user2.entries()).toEqual([['name', 'name2']]);
                unsub();
                done();
            }
        });
    });

    it('allows to subscribe to fields in another store', (done) => {
        const userStore = new MobxFirebaseStore(fb);

        const unsub = store.subscribeSubs([{
            subKey: 'item',
            asValue: true,
            forFields: [{
                store: userStore,
                fieldKey: 'userKey',
                fieldSubs: (fieldVal, arg1, arg2) => {
                    expect(fieldVal).toBe('user1');
                    expect(arg1).toBe('arg1');
                    expect(arg2).toBe('arg2');
                    return [{
                        subKey:'user_'+fieldVal,
                        asValue:true,
                        path: 'users/'+fieldVal
                    }]
                },
                args: ['arg1', 'arg2'] //just to show that you can pass args to fieldSubs
            }],
            path: 'item'
        }]);

        const item = {
            userKey: 'user1'
        };

        const users = {
            user1: {
                name: "name1"
            }
        };

        fb.child('item').set(item);
        fb.child('users').set(users);

        disposer = autorun(() => {
            const list = store.getData('item');

            //Users got stored in the userStore
            const user1 = userStore.getData('user_user1');

            if (list && user1) {
                expect(list.entries()).toEqual([['userKey', 'user1']]);
                expect(user1.entries()).toEqual([['name', 'name1']]);
                unsub();
                done();
            }
        });
    });

    it('updates children subscriptions when children change', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'list',
            asList: true,
            forEachChild: {
                childSubs: (childKey, arg1, arg2, childVal) => {
                    expect(arg1).toBe('arg1');
                    expect(arg2).toBe('arg2');
                    return [{
                        subKey:'user_'+childVal.userKey,
                        asValue:true,
                        path: 'users/'+childVal.userKey
                    }]
                },
                args: ['arg1', 'arg2'] //just to show that childVal is the last arg passed to childSubs
            },
            path: 'list'
        }]);

        const list = {
            firstUser: {userKey: 'user1'},
            secondUser: {userKey: 'user2'}
        };

        const users = {
            user1: {
                name: "name1"
            },
            user2: {
                name: "name2"
            },
            user3: {
                name: "name3"
            }
        };

        fb.child('list').set(list);
        fb.child('users').set(users);

        let updated = false;

        disposer = autorun(() => {
            const list = store.getData('list');

            //Users got stored in the userStore
            const user1 = store.getData('user_user1');
            const user2 = store.getData('user_user2');
            const user3 = store.getData('user_user3');

            if (list && user1 && user2 && !updated) {
                expect(user3).toBe(undefined);
                expect(store.subscribedRegistry).toContainKeys(['list', 'user_user1', 'user_user2']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(3);
                expect(list.entries()).toEqual([['firstUser', {userKey:'user1'}], ['secondUser', {userKey:'user2'}]]);
                expect(user1.entries()).toEqual([['name', 'name1']]);
                expect(user2.entries()).toEqual([['name', 'name2']]);

                updated = true;
                //Update children data

                fb.child('list').set({
                    firstUser: {userKey: 'user2'},
                    secondUser: {userKey: 'user3'}
                });
            }

            if (list && user2 && user3) {
                expect(store.subscribedRegistry).toContainKeys(['list', 'user_user2', 'user_user3']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(3);

                expect(list.entries()).toEqual([['firstUser', {userKey:'user2'}], ['secondUser', {userKey:'user3'}]]);
                expect(user2.entries()).toEqual([['name', 'name2']]);
                expect(user3.entries()).toEqual([['name', 'name3']]);

                unsub();
                done();
            }
        });
    });

    it('updates field subscriptions when field values change', (done) => {
        const unsub = store.subscribeSubs([{
            subKey: 'item',
            asValue: true,
            forFields: [{
                fieldKey: 'userKey',
                fieldSubs: (fieldVal, arg1, arg2) => {
                    expect(arg1).toBe('arg1');
                    expect(arg2).toBe('arg2');
                    return [{
                        subKey:'user_'+fieldVal,
                        asValue:true,
                        path: 'users/'+fieldVal
                    }]
                },
                args: ['arg1', 'arg2'] //just to show that you can pass args to fieldSubs
            }],
            path: 'item'
        }]);

        const item = {
            userKey: 'user1'
        };

        const users = {
            user1: {
                name: "name1"
            },
            user2: {
                name: "name2"
            }
        };

        fb.child('item').set(item);
        fb.child('users').set(users);

        let updated = false;

        disposer = autorun(() => {
            const item = store.getData('item');

            //Users got stored in the userStore
            const user1 = store.getData('user_user1');
            const user2 = store.getData('user_user2');

            if (item && user1 && !updated) {
                expect(user2).toBe(undefined);
                expect(store.subscribedRegistry).toContainKeys(['item', 'user_user1']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(2);
                expect(item.entries()).toEqual([['userKey', 'user1']]);
                expect(user1.entries()).toEqual([['name', 'name1']]);

                //Update field data
                updated = true;
                fb.child('item').child('userKey').set('user2');
            }

            if (item && user2) {
                expect(store.subscribedRegistry).toContainKeys(['item', 'user_user2']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(2);
                expect(item.entries()).toEqual([['userKey', 'user2']]);
                expect(user2.entries()).toEqual([['name', 'name2']]);
                unsub();
                done();
            }
        });
    });

    it('updates children subscriptions when children change, without throttling', (done) => {
        const store = new MobxFirebaseStore(fb, {throttle: {shouldThrottle:false}});

        const unsub = store.subscribeSubs([{
            subKey: 'list',
            asList: true,
            forEachChild: {
                childSubs: (childKey, arg1, arg2, childVal) => {
                    expect(arg1).toBe('arg1');
                    expect(arg2).toBe('arg2');
                    return [{
                        subKey:'user_'+childVal.userKey,
                        asValue:true,
                        path: 'users/'+childVal.userKey
                    }]
                },
                args: ['arg1', 'arg2'] //just to show that childVal is the last arg passed to childSubs
            },
            path: 'list'
        }]);

        const list = {
            firstUser: {userKey: 'user1'},
            secondUser: {userKey: 'user2'}
        };

        const users = {
            user1: {
                name: "name1"
            },
            user2: {
                name: "name2"
            },
            user3: {
                name: "name3"
            }
        };

        fb.child('list').set(list);
        fb.child('users').set(users);

        let updated = false;

        disposer = autorun(() => {
            const list = store.getData('list');

            //Users got stored in the userStore
            const user1 = store.getData('user_user1');
            const user2 = store.getData('user_user2');
            const user3 = store.getData('user_user3');

            if (list && user1 && user2 && !updated) {
                expect(user3).toBe(undefined);
                expect(store.subscribedRegistry).toContainKeys(['list', 'user_user1', 'user_user2']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(3);
                expect(list.entries()).toEqual([['firstUser', {userKey:'user1'}], ['secondUser', {userKey:'user2'}]]);
                expect(user1.entries()).toEqual([['name', 'name1']]);
                expect(user2.entries()).toEqual([['name', 'name2']]);

                updated = true;
                //Update children data

                setTimeout(() => {
                    fb.child('list').set({
                        firstUser: {userKey: 'user2'},
                        secondUser: {userKey: 'user3'}
                    })
                }, 1)
            }

            if (list && user2 && user3 && list.get('secondUser').userKey == 'user3') {
                expect(store.subscribedRegistry).toContainKeys(['list', 'user_user2', 'user_user3']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(3);

                expect(list.entries()).toEqual([['firstUser', {userKey:'user2'}], ['secondUser', {userKey:'user3'}]]);
                expect(user2.entries()).toEqual([['name', 'name2']]);
                expect(user3.entries()).toEqual([['name', 'name3']]);

                unsub();
                done();
            }
        });
    });

    it('updates field subscriptions when field values change, without throttling', (done) => {
        const store = new MobxFirebaseStore(fb, {throttle: {shouldThrottle:false}});

        const unsub = store.subscribeSubs([{
            subKey: 'item',
            asValue: true,
            forFields: [{
                fieldKey: 'userKey',
                fieldSubs: (fieldVal, arg1, arg2) => {
                    expect(arg1).toBe('arg1');
                    expect(arg2).toBe('arg2');
                    return [{
                        subKey:'user_'+fieldVal,
                        asValue:true,
                        path: 'users/'+fieldVal
                    }]
                },
                args: ['arg1', 'arg2'] //just to show that you can pass args to fieldSubs
            }],
            path: 'item'
        }]);

        const item = {
            userKey: 'user1'
        };

        const users = {
            user1: {
                name: "name1"
            },
            user2: {
                name: "name2"
            }
        };

        fb.child('item').set(item);
        fb.child('users').set(users);

        let updated = false;

        disposer = autorun(() => {
            const item = store.getData('item');

            //Users got stored in the userStore
            const user1 = store.getData('user_user1');
            const user2 = store.getData('user_user2');

            if (item && user1 && !updated) {
                expect(user2).toBe(undefined);
                expect(store.subscribedRegistry).toContainKeys(['item', 'user_user1']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(2);
                expect(item.entries()).toEqual([['userKey', 'user1']]);
                expect(user1.entries()).toEqual([['name', 'name1']]);

                //Update field data
                updated = true;
                setTimeout(() => fb.child('item').child('userKey').set('user2'), 1);
            }

            if (item && user2 && item.get('userKey') == 'user2') {
                expect(store.subscribedRegistry).toContainKeys(['item', 'user_user2']);
                expect(Object.keys(store.subscribedRegistry).length).toBe(2);
                expect(item.entries()).toEqual([['userKey', 'user2']]);
                expect(user2.entries()).toEqual([['name', 'name2']]);
                unsub();
                done();
            }
        });
    });

    it('removes data on last unsubscribe', (done) => {
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

        let sawData = false;
        disposer = autorun(() => {
            const data = store.getData('data');
            if (data) {
                sawData = true;
                expect(data.entries()).toEqual([['field1', 'val1'], ['field2', 'val2']]);
                unsub();
            } else if (sawData) {
                //we have seen data but now it's gone again - was removed on unsubscribe
                expect(store.getData('data')).toBe(undefined);
                done();
            }
        });
    });

    it('provides a Promise for subKey loading', (done) => {
        const subs = [{
            subKey: 'list',
            asValue: true,
            forEachChild: {
                childSubs: (childKey, childVal) => {
                    return [{subKey:'child_'+childKey, asValue:true, path: 'details/'+childKey}]
                }
            },
            path: 'list'
        }];

        const {unsubscribe, promise} = store.subscribeSubsWithPromise(subs);

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

        promise.then(() => {
            const list = store.getData('list');
            const child1Data = store.getData('child_child1');
            const child2Data = store.getData('child_child2');
            expect(list.entries()).toEqual([['child1', 1], ['child2', 1]]);
            expect(child1Data.entries()).toEqual([[primitiveKey, 'child1Detail']]);
            expect(child2Data.entries()).toEqual([[primitiveKey, 'child2Detail']]);
            unsubscribe();
            done();
        });
    });
});