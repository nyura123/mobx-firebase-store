import "babel-polyfill";

import ReactDOM from 'react-dom';

import App from './App';

const config = {
    fbUrl: 'https://testing-3bba1.firebaseio.com'
}

ReactDOM.render(<App config={config} />, document.getElementById('app'));


