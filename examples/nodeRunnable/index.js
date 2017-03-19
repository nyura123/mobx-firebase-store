const MobxFirebaseStore = require('mobx-firebase-store');
const Firebase = require('firebase');
const mobx = require('mobx');

const fb = new Firebase('https://docs-examples.firebaseio.com');
const store = new MobxFirebaseStore.default(fb);

console.log('subscribing to messages...');
const subInfo = store.subscribeSubsWithPromise([{
    subKey: 'msgs', //can use any name you want to describe the data source/subscription
    asList: true,
    path: 'samplechat/messages', //firebase location
    childSubs: function(messageKey, messageData) {
        return [{
            subKey: 'user_'+messageData.uid,
            asValue: true,
            path: 'samplechat/users/'+messageData.uid
        }];
    }
}]);

//subInfo.unsubscribe() should be called when we want to unsubscribe

subInfo.promise.then(() => {
    console.log('\ninitial messages+users loaded');
});

mobx.autorun(() => {
    const data = store.getData('msgs');
    console.log('\nmessages:');
    console.log(data ? data.values() : data);
    if (data) {
        (data.entries() || []).forEach(function(entry) {
            console.log(' user for message '+entry[0]+', user '+entry[1].uid+':');
            const userData = store.getData('user_'+entry[1].uid);
            console.log(userData ? userData.values() : userData);
        });
    }
});


//Update firebase data using raw Firebase API.
//Can wrap in mobx @actions, add methods to a MobxFirebaseStore subclass, etc.
//store.fb.child('samplechat').child('msgKey1').set(aMessage, (error) => {/*...*/});