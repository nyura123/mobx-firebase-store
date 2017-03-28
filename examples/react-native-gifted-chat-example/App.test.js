import React from 'react';
import firebase from 'firebase';
import renderer from 'react-test-renderer';
import FirebaseServer from 'firebase-server';
import MobxFirebaseStore from 'mobx-firebase-store';
import AppComponent from './src/AppComponent';

//NOTE: Requires entry to be added to your host file (e.g. /etc/hosts)
//127.0.0.1 localhost.firebaseio.test

//fixes "addEventListener and attachEvent not available" error
jest.mock('firebase/auth-node', ((...args) => {
  return {}
}));

//https://github.com/mobxjs/mobx-react/issues/186
//https://wietse.loves.engineering/using-jest-with-react-native-and-mobx-34949ea7d2cf#.v11m3rh84
jest.mock('mobx-react/native', () => require('mobx-react/custom'));

// real GiftedChat doesn't get the onLayout event which is required for it to render messages
jest.mock('./src/GiftedChatWrapper', () => {
  const actual = require.requireActual('./src/GiftedChatWrapper');
  const React = require('react');
  class MyGiftedChat extends React.Component {
    render() {
      const messages = (this.props.messages || []).map(message => message.text + ' GIFTEDMOCK '+message.user.name).join('\n');
      return React.createElement('Text', {name:'MockedGiftedChat'}, [messages]);
    }
  }
  MyGiftedChat.propTypes = actual.propTypes;
  return MyGiftedChat;
});


const mockFbData = {
  chat: {
    messages: {msg1: {text: 'hi', timestamp: 24982749824, uid: 'user1'}},
    users: {user1: {first: 'user1First', last: 'user2Last'}}
  }
}

describe('Chat app', () => {
  let store, fb, server;

  beforeEach(() => {
    //From https://medium.com/@io.marco.valente/testing-firebase-with-mocha-locally-da7920c902f1
    const config = {
      apiKey: 'fake-api-key-for-testing-purposes-only',
      databaseURL: 'ws://localhost.firebaseio.test:5000'
    }
    server = new FirebaseServer(5000, 'localhost.firebaseio.test', mockFbData);
    const fbApp = firebase.initializeApp(config, 'TestingEnvironment');
    const fb = firebase.database(fbApp).ref();

    store = new MobxFirebaseStore(fb);
  });

  afterEach(function () {
    fb && fb.set(null);
    if (server) {
      server.close();
      server = null;
    }
  });

  it('renders App without crashing', (done) => {
    const rendered = renderer.create(<AppComponent store={store}/>);
    expect(rendered.toJSON()).toBeTruthy();

    //Wait for data to come in
    setTimeout(() => {
      const jsonStr = JSON.stringify(rendered);
      expect(jsonStr.indexOf('hi GIFTEDMOCK user1First user2Last') >= 0).toBe(true);
      done()
    }, 100);
  });
})
