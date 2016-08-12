
import React, { Component } from 'react';

/* App state and actions */
import DinosaurStore from './DinosaurStore';
import AuthStore from './AuthStore';

import DinosaurList from './DinosaurList';

export default class App extends Component {
    componentWillMount() {
        this.store = new DinosaurStore(this.props.config);
        this.authStore = new AuthStore();
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
        return <DinosaurList stores={this.stores} />;
    }
}
