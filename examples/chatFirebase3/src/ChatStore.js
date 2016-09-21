
import MobxFirebaseStore from 'mobx-firebase-store';

import firebase from 'firebase';

const userStr = 'userDetail_';
const allMsgsStr = 'allMsgs';
const allUsersStr = 'allUsers';

export default class ChatStore extends MobxFirebaseStore {
    constructor() {
        super(firebase.database().ref());
    }
    
    //write to firebase
    addMessage({text, uid, timestamp}, cb) {
        return this.fb.child('chat').child('messages').push({text, uid, timestamp});
    }
    deleteMessage(messageKey, cb) {
        return this.fb.child('chat').child('messages').child(messageKey).set(null);
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

    allMsgsSubs() {
        return [{
            subKey: allMsgsStr,
            asList: true,
            path: 'chat/messages',
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