import "babel-polyfill";

import React from 'react';
import ReactDOM from 'react-dom';

/* App state and actions */
import DinosaurStore from './DinosaurStore';
import DinosaurList from './DinosaurList';

//Replace apiKey with your key, though you should be able to see this data even without doing that
const config = {
    apiKey: "yourKeyGoesHere",
    authDomain: "localhost",
    databaseURL: "https://dinosaur-facts.firebaseio.com",
    storageBucket: "dinosaur-facts.firebaseio.com",
};

const store = new DinosaurStore(config);

ReactDOM.render(<DinosaurList store={store}/>, document.getElementById('app'));
