
import React, { Component } from 'react';
import { ObservableSubscriptionGraph } from 'mobx-firebase-store';

/* App state and actions */
import DinosaurStore from './DinosaurStore';
import AuthStore from './AuthStore';

import DinosaurList from './DinosaurList';

export default class App extends Component {
    componentWillMount() {
        this.store = new DinosaurStore();
        this.authStore = new AuthStore();
        this.subscriptionGraph = new ObservableSubscriptionGraph(this.store);
        this.stores = {
            store: this.store,
            authStore: this.authStore
        }
    }

    componentWillUnmount() {
        if (this.authStore) {
            this.authStore.cleanup();
        }
    }

    render() {
        return <DinosaurList subscriptionGraph={this.subscriptionGraph} stores={this.stores} />;
    }
}
