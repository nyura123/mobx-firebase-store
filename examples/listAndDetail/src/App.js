
import React, { Component } from 'react';

/* App state and actions */
import DinosaurStore from './DinosaurStore';
import DinosaurList from './DinosaurList';

export default class App extends Component {
    componentWillMount() {
        this.store = new DinosaurStore(this.props.config);
    }

    componentWillUnmount() {
        //
    }

    render() {
        return <DinosaurList store={this.store} />
    }
}
