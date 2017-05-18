import firebase from 'firebase'
import MobxFirebaseStore, {ObservableSubscriptionGraph} from 'mobx-firebase-store'
import {loginApi, logoutApi} from './api'
import {observable, action} from 'mobx'

function initFirebaseApp(appName) {
  const apiKey = 'yourApiKey'
  let res
  try {
    res = firebase.initializeApp({
      apiKey,
      authDomain: "localhost",
      databaseURL: 'https://testing-3bba1.firebaseio.com',
      storageBucket: 'testing-3bba1.firebaseio.com'
    }, appName)
  } catch(e) {
    console.log(e)
  }
  return res
}

let store = null

export function getFirebaseInfo(appName) {
  if (global.serverFirebase) {
    //firebase-admin
    return {app: null, ref: global.serverFirebase.database().ref()}
  } else {
    const fbApp = initFirebaseApp(appName)
    return {app: fbApp, ref: firebase.database(fbApp).ref()}
  }
}

const allUsersStr = 'all_users'
function limitedMsgsStr(limitTo) {
  return 'msgs_limitTo_'+limitTo
}
function usrStr(uid) {
  return 'user_'+uid
}

class Store {
  constructor (appName, decodedToken, initialData) {
    const { app, ref } = getFirebaseInfo(appName)
    this.fbApp = app
    this.ref = ref

    //watch auth on the client and keep it in observable authUser
    if (typeof window !== 'undefined') {
      this.auth = observable({
        authUser: decodedToken //initialize the client's auth state from server (or null/undefined if creating store on client)
      })

      this.unwatchAuth = firebase.auth(this.fbApp).onAuthStateChanged(user => {
        this.auth.authUser = user

        //Sync the local auth change back to server
        if (!user) {
          logoutApi()
        } else {
          loginApi(user)
        }
      })
    } else {
      //When rendering on server, use this in authUser() getter (for logged-in rendering)
      this.decodedToken = decodedToken
    }

    this.mbStore = new MobxFirebaseStore(ref)

    //dev tools to see live subscription graph
    this.subscriptionGraph = new ObservableSubscriptionGraph(this.mbStore)

    if (initialData) {
      this.mbStore.resetFromData(initialData)
    }
  }

  //Convenience pass-through methods
  toJS() {
    return this.mbStore.toJS()
  }

  subscribeSubsWithPromise(subs) {
    return this.mbStore.subscribeSubsWithPromise(subs)
  }

  //Get underlying firebase ref
  fbRef() {
    return this.ref
  }

  //Can define getters like getAllMessages, etc
  limitedMessages(limitTo) {
    return this.mbStore.getData(limitedMsgsStr(limitTo))
  }
  
  allUsers() {
    return this.mbStore.getData(allUsersStr)
  }

  user(userKey) {
    return this.mbStore.getData(usrStr(userKey))
  }

  //Actions - write to firebase
  @action
  addMessage({text, uid, timestamp}) {
    return this.ref.child('chat').child('messages').push({text, uid, timestamp})
  }
  @action
  deleteMessage(messageKey) {
    return this.ref.child('chat').child('messages').child(messageKey).remove()
  }
  @action
  addMessagesTimes(uid, times, timestamp) {
    const promises = []
    for (let i = 0; i < times; ++i) {
      promises.push(this.addMessage({text: 'batch added '+i, uid, timestamp}))
    }
    return Promise.all(promises)
  }
  @action
  deleteAll() {
    return this.ref.child('chat').child('messages').remove()
  }

  //Auth

  //observable user on client, or session's decodedToken on server
  authUser() {
    return this.auth ? this.auth.authUser : this.decodedToken
  }

  watchAuth(cb) {
    return firebase.auth(this.fbApp).onAuthStateChanged(cb)
  }

  signIn({email, password}) {
    return firebase.auth(this.fbApp).signInWithEmailAndPassword(email, password)
  }

  createUser({email, password}) {
    return firebase.auth(this.fbApp).createUserWithEmailAndPassword(email, password)
  }

  signOut() {
    return firebase.auth(this.fbApp).signOut()
  }
}

export function loadInitialData(appName, subs) {
  const store = initStore(appName)

  const { promise, unsubscribe } = store.subscribeSubsWithPromise(subs)

  //Don't forget to unsubscribe.
  // If on client, don't want to unsubscribe too early so that component's subscribeSubs can be called first
  // without firebase cache being blown away by this unsubscribe
  setTimeout(() => console.log('initial unsubscribe...')||unsubscribe(), 1000)
  
  return promise.then(() => {
    return store.toJS()
  }).catch((e) => {
    console.error('error loading initial data: ',e)
    return {}
  })
}

export function initStore (appName, decodedToken, initialData) {
  if (typeof window === 'undefined') {
    return new Store(appName, decodedToken, initialData)
  } else {
    //On client, reuse the same store
    if (store === null) {
      store = new Store(appName, decodedToken, initialData)
    }
    return store
  }
}

export function limitedMessagesSubs(limitTo, fbRef) {
  limitTo = limitTo || 1
  return [{
    subKey: limitedMsgsStr(limitTo), //important to include limitTo in key so subscription gets updated
    asValue: true, //if order matters and don't want to sort client-side; otherwise use asList: true
    resolveFirebaseRef: () => fbRef.child('chat/messages').limitToLast(limitTo),
    childSubs: (messageKey, messageData) => !messageData.uid ? [] : [
      {subKey: usrStr(messageData.uid), asValue: true, resolveFirebaseRef: () => fbRef.child('chat/users').child(messageData.uid)}
    ],

    //Optional - get data callbacks after store data is already updated:
    //onData: (type, snapshot) => console.log('got data: ', type, 'myMsgs', snapshot.val()),

    //Optional - transform data before it's stored. Have to return a new object for it to work
    transformChild: (messageData) => Object.assign({}, messageData, {text: (messageData.text || '').toUpperCase()})
  }]
}

export function allUsersSubs() {
  return [{
    subKey: allUsersStr,
    asList: true,
    path: 'chat/users',
    onData: (type, snapshot) => console.log('got data: ', type, allUsersStr, snapshot.val())
  }]
}
