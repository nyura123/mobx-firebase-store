import React, {Component} from 'react';

import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';

/*
 Display messages and users for each message
 */

var dateFmtOptions = {
    weekday: "long", year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit"
};
const dateLocale = 'en-US';

class MessageList extends Component {
    //implement getSubs and subscribeSubs for autoSubscriber:
    // subscribe to messages and user for each message; also subscribe to all existing users for user <select>
    static getSubs(props, state) {
        return props.store.allMsgsSubs().concat(props.store.allUsersSubs());
    }
    static subscribeSubs(subs, props, state) {
        return props.store.subscribeSubs(subs);
    }

    constructor(props) {
        super(props);
        this.state = {
            newMessageText: null,
            newMessageUserOptionValue: 'cookiemonster'
        };
        this.addMessageBound = this.addMessage.bind(this);
    }

    deleteMessage(messageKey) {
        this.props.store.deleteMessage(messageKey);
    }

    addMessage() {
        const { newMessageText, newMessageUserOptionValue } = this.state;
        if (!newMessageText || !newMessageUserOptionValue) return;

        this.props.store.addMessage({
            text: newMessageText,
            timestamp: new Date().getTime(),
            uid: newMessageUserOptionValue
        });
        //Clear field
        this.setState({
            newMessageText: null
        })
    }

    renderMessage(messageKey, messageData) {
        const user = this.props.store.user(messageData.uid);

        return (
            <div style={{border:'1px grey solid'}} key={messageKey}>
                <div>{messageData.text}</div>
                <div>Posted {new Date(messageData.timestamp).toLocaleDateString(dateLocale, dateFmtOptions)}</div>
                {user && <div>By {user.get('first') || ''}{' '}{user.get('last') || ''}</div>}
                <button onClick={()=>this.deleteMessage(messageKey)}>Delete</button>
            </div>
        );
    }

    renderUsersOptions() {
        const users = this.props.store.allUsers();
        if (!users) return null;
        return users.entries().map(entry => {
            return (
                <option key={entry[0]}
                    value={entry[0]}>{entry[1].first}{' '}{entry[1].last}
                </option>
            );
        });
    }

    render() {
        const messages = this.props.store.allMsgs();
        if (!messages) {
            return <div>Loading messages...</div>
        }

        const { newMessageText, newMessageUserOptionValue } = this.state;
        return (
            <div>
                <div>Enter New Message:
                    <input onChange={(e) => this.setState({newMessageText: e.target.value})}
                           placeholder="enter text"
                           value={newMessageText} />
                    <select
                        onChange={(e) => this.setState({newMessageUserOptionValue: e.target.value})}
                        value={newMessageUserOptionValue}>
                        <option value=''>Select User</option>
                        {this.renderUsersOptions()}
                    </select>
                    <button onClick={this.addMessageBound}>Send</button>
                </div>
                <div>
                    Messages:
                    {messages.keys().map(messageKey => this.renderMessage(messageKey, messages.get(messageKey)))}
                </div>
            </div>
        );
    }
}

export default autoSubscriber(observer(MessageList));
