import "babel-polyfill";

import React from 'react';
import ReactDOM from 'react-dom';

/* App state and actions */
import DinosaurStore from './DinosaurStore';
import DinosaurList from './DinosaurList';

const config = {
    fbUrl: 'https://dinosaur-facts.firebaseio.com'
}
const store = new DinosaurStore(config);

ReactDOM.render(<DinosaurList store={store}/>, document.getElementById('app'));
