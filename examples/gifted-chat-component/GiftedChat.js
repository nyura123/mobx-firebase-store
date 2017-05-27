import React, {Component, PropTypes} from 'react';

import { Text, View } from 'react-native';
import { GiftedChat as RNGiftedChat } from 'react-native-gifted-chat';

class RNGiftedChatPatched extends RNGiftedChat {
  constructor(props) {
    super(props);
    this.origOnInputSizeChanged = this.onInputSizeChanged.bind(this);

    this.onInputSizeChanged = (size) => {
      //with react-native-web, onInputSizeChange gets an undefined size so patch it with size:60
      this.origOnInputSizeChanged(size || {size:60});
    }

    this.scrollToBottom = (animated = true) => {
      //override to do nothing - otherwise there's a crash within react-native-gifted-chat-component
    }
  }
}

export function messagesInGiftedChatFormat({msgs, store}) {

  if (!msgs) {
    return [];
  }

  const res = msgs.map((entry) => {
    const msgKey = entry[0];
    const msg = entry[1];
    const uid = msg.uid || null;

    //Gifted message will not update unless msgKey changes. So as user info comes in, add user's info to the message key
    //const userInfoHash = user ? `${user.get('first')}_${user.get('last')}` : '';

    return {
      _id: msgKey,// + userInfoHash,
      text: msg.text || '',
      createdAt: new Date(msg.timestamp),
      user: {
        _id: uid,
        name: uid
        //avatar: 'https://facebook.github.io/react/img/logo_og.png'
      }
    }
  });

  //Show latest messages on the bottom
  res.reverse();

  return res;
}

export default class GiftedChat extends Component {
  static propTypes = {
    ownUid: PropTypes.any,
    onSend: PropTypes.func.isRequired,
    messages: PropTypes.array,
    isLoadingEarlier: PropTypes.bool,
    loadEarlier: PropTypes.func
  }

  render() {
    const { messages, onSend, ownUid, height=200, style={}, isLoadingEarlier, loadEarlier } = this.props;

    return (
      <View style={{height, backgroundColor:'steelblue', ...style}}>
        <RNGiftedChatPatched
          messages={messages}
          onSend={onSend}
          loadEarlier={!!loadEarlier}
          onLoadEarlier={loadEarlier}
          isLoadingEarlier={isLoadingEarlier}
          user={{
            _id: ownUid
          }}
        />
      </View>
    );
  }
}

