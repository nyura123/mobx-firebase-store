import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import DinosaurApp from '../../../examples/listAndDetailFirebase3/src/App';
import ChatApp from '../../../examples/chatFirebase3/chatApp';
import PaginationExample from '../../../examples/pagination/index';
import GiftedChat from '../../../examples/gifted-chat/index'

import firebase from 'firebase';
const config = {
  apiKey: 'yourApiKey',
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',//"https://dinosaur-facts.firebaseio.com",
  storageBucket: 'testing-3bba1.firebaseio.com'//"dinosaur-facts.firebaseio.com",
};
firebase.initializeApp(config);

// storiesOf('Dinosaurs', module)
//     .add('', () => {
//       return <DinosaurApp />
//     });


storiesOf('Chat', module)
  .add('', () => {
    return <ChatApp />
  });

storiesOf('Pagination example', module)
  .add('', () => {
    return <PaginationExample />
  });

storiesOf('GiftedChat example', module)
  .add('', () => {
    return <GiftedChat />
  });