
import firebase from 'firebase';

import { observable } from 'mobx';

export default class AuthStore {
    constructor() {
        this.auth = observable({
            authUser: null,
            authError: null
        });

        this.unwatchAuth = firebase.auth().onAuthStateChanged(user => {
            this.auth.authUser = user;
        });
    }

    watchAuth(onUser, onError) {
     return firebase.auth().onAuthStateChanged(onUser, onError);
    };

    //This should be called if we have multiple instances of AuthStore.
    // For example, if AuthStore lives inside an App component, call reset() in App's componentWillUnmount.
    //If there's only a singleton AuthStore, then it's ok to never call this. 
    reset() {
        this.auth = observable({
            authUser: null,
            authError: null
        });
        if (this.unwatchAuth) {
            this.unwatchAuth();
            this.unwatchAuth = null;
        }
    }

    signIn({email, password}) {
        if (this.auth.authUser) {
            return Promise.resolve(this.auth.authUser);
        }
        return firebase.auth().signInWithEmailAndPassword(email, password)
            .then(user => {
                this.auth.authError = null;
                return user;
            })
            .catch(error => {
                this.auth.authError = error;
                return error;
            });
    }

    createUser({email, password}) {
        return firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(user => {
                this.auth.authError = null;
                return user;
            })
            .catch(error => {
                this.auth.authError = error;
                return error;
            });
    }

    signOut() {
        return firebase.auth().signOut()
            .then(() => {
                this.auth.authUser = null;
                this.auth.authError = null;
                return user;
            })
            .catch(error => {
                this.auth.authUser = null;
                this.auth.authError = null;
                return error;
            });
    }
}