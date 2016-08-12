import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import DinosaurApp from '../../../examples/listAndDetailFirebase3/src/App';

storiesOf('Dinosaurs', module)
    .add('', () => {
      const config = {
        apiKey: 'AIzaSyDsVVkVQ1RWPZ2wf6pc73hmynb31-COp4A',//"yourKeyGoesHere",
        authDomain: "localhost",
        databaseURL: 'https://testing-3bba1.firebaseio.com',//"https://dinosaur-facts.firebaseio.com",
        storageBucket: 'testing-3bba1.firebaseio.com'//"dinosaur-facts.firebaseio.com",
      };
      return <DinosaurApp config={config}/>
    });