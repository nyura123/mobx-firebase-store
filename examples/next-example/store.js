import firebase from 'firebase'
import MobxFirebaseStore from 'mobx-firebase-store'

function initFirebaseApp(appName) {
  const apiKey = 'yourApiKey'
  return firebase.initializeApp({
    apiKey,
    authDomain: "localhost",
    databaseURL: 'https://testing-3bba1.firebaseio.com',
    storageBucket: 'testing-3bba1.firebaseio.com'
  }, appName)
}

let store = null

function getFirebaseRef(appName) {
  if (global.serverFirebase) {
    //firebase-admin
    return global.serverFirebase.database().ref()
  } else {
    const fbApp = initFirebaseApp(appName)
    return firebase.database(fbApp).ref()
  }
}

class Store {
  constructor (appName, initialData) {
    this.mbStore = new MobxFirebaseStore(getFirebaseRef(appName))
    if (initialData) {
      this.mbStore.resetFromData(initialData)
    }
  }

  //can define actions (that would write to firebase), getters
  
  getData(subKey) {
    return this.mbStore.getData(subKey)
  }

  toJS() {
    return this.mbStore.toJS()
  }
  
  subscribeSubsWithPromise(subs) {
    return this.mbStore.subscribeSubsWithPromise(subs)
  }
  
  fbRef() {
    return this.mbStore.fb
  }
}

export function loadInitialData(isServer, appName, getSubs) {
  const store = initStore(isServer, appName)

  const { promise, unsubscribe } = store.subscribeSubsWithPromise(getSubs(store.fbRef()))

  //Don't forget to unsubscribe.
  // If on client, don't want to unsubscribe too early so that component's subscribeSubs can be called first
  // without firebase cache being blown away by this unsubscribe
  setTimeout(() => unsubscribe(), 1000)
  
  return promise.then(() => {
    return store.toJS()
  }).catch((e) => {
    console.error('error loading initial data: ',e)
    return {}
  })
}

export function initStore (isServer, appName, initialData) {
  if (typeof window === 'undefined') {
    return new Store(appName, initialData)
  } else {
    //On client, reuse the same store
    if (store === null) {
      store = new Store(appName, initialData)
    }
    return store
  }
}
