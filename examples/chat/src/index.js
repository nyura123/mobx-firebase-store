import "babel-polyfill";

import React from 'react';
import ReactDOM from 'react-dom';

/* App state and actions */
import ChatStore from './ChatStore';
import MessageList from './MessageList';

const config = {
    fbUrl: 'https://testing-3bba1.firebaseio.com'
}
const store = new ChatStore(config);

ReactDOM.render(<MessageList store={store}/>, document.getElementById('app'));
