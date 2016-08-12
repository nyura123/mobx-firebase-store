
import React, { Component, PropTypes } from 'react';

/* App state and actions */
import ChatStore from './ChatStore';
import MessageList from './MessageList';

export default class App extends Component {
    componentWillMount() {
        this.store = new ChatStore(this.props.config);
    }
    componentWillUnmount() {
        //
    }
    render() {
        return <MessageList store={this.store}/>
    }
}
