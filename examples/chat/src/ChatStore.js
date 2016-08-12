
import MobxFirebaseStore from 'mobx-firebase-store';

import Firebase from 'firebase';

const userStr = 'userDetail_';
const allMsgsStr = 'allMsgs';
const allUsersStr = 'allUsers';

export default class ChatStore extends MobxFirebaseStore {
    constructor(config) {
        super(new Firebase(config.fbUrl));
    }

    //write to firebase
    addMessage({text, uid, timestamp}, cb) {
        this.fb.child('chat').child('messages').push({text, uid, timestamp}, (error) => {
            if (cb) cb(error ? error.code : null);
        });
    }
    deleteMessage(messageKey, cb) {
        this.fb.child('chat').child('messages').child(messageKey).set(null, (error) => {
            if (cb) cb(error ? error.code : null);
        });
    }

    //getters
    user(userKey) {
        return this.getData(userStr + userKey);
    }
    allMsgs() {
        return this.getData(allMsgsStr);
    }
    allUsers() {
        return this.getData(allUsersStr);
    }

    //subs -- all paths should be relative to config.fbUrl
    allMsgsSubs() {
        return [{
            subKey: allMsgsStr, //can use any name you want to describe the data source/subscription
            asList: true,
            path: 'chat/messages', //firebase location
            forEachChild: {
                childSubs: function(messageKey, messageData) {
                    return [{
                        subKey: userStr+messageData.uid,
                        asValue: true,
                        path: 'chat/users/'+messageData.uid
                    }];
                }
            }
        }];
    }
    allUsersSubs() {
        return [{
           subKey: allUsersStr,
           asList: true,
           path: 'chat/users'
        }];
    }
}