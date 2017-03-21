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
