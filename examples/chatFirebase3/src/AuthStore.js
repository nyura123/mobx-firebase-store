
import firebase from 'firebase';

import { observable } from 'mobx';

export default class AuthStore {
    constructor() {
        this.auth = observable({
            authUser: null
        });

        this.unwatchAuth = firebase.auth().onAuthStateChanged(user => {
            this.auth.authUser = user;
        });
    }
    
    authUser() {
        return this.auth.authUser;
    }

    cleanup() {
        if (this.unwatchAuth) {
            this.unwatchAuth();
        }
    }

    signIn({email, password}) {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    }

    createUser({email, password}) {
        return firebase.auth().createUserWithEmailAndPassword(email, password);
    }

    signOut() {
        return firebase.auth().signOut();
    }
}