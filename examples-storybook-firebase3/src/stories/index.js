import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import DinosaurApp from '../../../examples/listAndDetailFirebase3/src/App';

import firebase from 'firebase';
const config = {
  apiKey: 'AIzaSyAo4s50D9rInrOVyq0TXeKvtSwrvWpcfb0',
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',//"https://dinosaur-facts.firebaseio.com",
  storageBucket: 'testing-3bba1.firebaseio.com'//"dinosaur-facts.firebaseio.com",
};
firebase.initializeApp(config);

storiesOf('Dinosaurs', module)
    .add('', () => {
      return <DinosaurApp />
    });
