import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import ChatApp from '../../../examples/chat/src/App';
import DinosaurApp from '../../../examples/listAndDetail/src/App';

storiesOf('ChatApp', module)
    .add('', () => (
        <ChatApp config={{fbUrl: 'https://testing-3bba1.firebaseio.com'}} />
    ));

storiesOf('Dinosaurs', module)
    .add('', () => (
        <DinosaurApp config={{fbUrl: 'https://dinosaur-facts.firebaseio.com'}} />
    ));
