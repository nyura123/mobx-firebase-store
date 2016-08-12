import "babel-polyfill";

import React from 'react';
import ReactDOM from 'react-dom';

/* App state and actions */
import App from './App';

const config = {
    fbUrl: 'https://dinosaur-facts.firebaseio.com'
};

ReactDOM.render(<App config={config}/>, document.getElementById('app'));
