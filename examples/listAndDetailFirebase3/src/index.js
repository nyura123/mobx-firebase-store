import "babel-polyfill";

import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';

//Replace apiKey with your key, though you should be able to see this data even without doing that
const config = {
    apiKey: 'AIzaSyDsVVkVQ1RWPZ2wf6pc73hmynb31-COp4A',//"yourKeyGoesHere",
    authDomain: "localhost",
    databaseURL: 'https://testing-3bba1.firebaseio.com',//"https://dinosaur-facts.firebaseio.com",
    storageBucket: 'testing-3bba1.firebaseio.com'//"dinosaur-facts.firebaseio.com",
};

ReactDOM.render(<App config={config} />, document.getElementById('app'));
