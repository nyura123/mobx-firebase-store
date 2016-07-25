import React, {Component} from 'react';

import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';

/*
 Display messages and users for each message
 */

const dateFmtOptions = {
    weekday: 'long', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
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
            error: null,
            newMessageUid: 'cookiemonster'
        };
        this.addMessageBound = this.addMessage.bind(this);
    }

    deleteMessage(messageKey) {
        this.props.store.deleteMessage(messageKey, (error) => {
            this.setState({error});
        });
    }

    addMessage() {
        const { newMessageText, newMessageUid } = this.state;
        if (!newMessageText || !newMessageUid) {
            this.setState({error: 'missing text or user selection'});
            return;
        }

        this.props.store.addMessage({
            text: newMessageText,
            timestamp: new Date().getTime(),
            uid: newMessageUid
        }, (error) => {
            //Clear field and show any error
            this.setState({error, newMessageText: null});
        });
    }

    renderMessage(messageKey, messageData) {
        const user = this.props.store.user(messageData.uid);

        return (
            <div style={{border:'1px grey solid'}} key={messageKey}>
                <div>
                    {messageData.text}
                </div>
                <div>
                    Posted {new Date(messageData.timestamp).toLocaleDateString(dateLocale, dateFmtOptions)}
                </div>
                {user && <div>By {user.get('first') || ''}{' '}{user.get('last') || ''}</div>}
                <button onClick={()=>this.deleteMessage(messageKey)}>
                    Delete
                </button>
            </div>
        );
    }

    renderUsersOptions() {
        const users = this.props.store.allUsers();
        if (!users) return null;
        return users.entries().map(entry => {
            const uid = entry[0];
            const userData = entry[1];
            return (
                <option key={uid} value={uid}>
                    {userData.first}{' '}{userData.last}
                </option>
            );
        });
    }

    render() {
        const messages = this.props.store.allMsgs();
        if (!messages) {
            return <div>Loading messages...</div>
        }

        const { newMessageText, newMessageUid, error } = this.state;
        return (
            <div>
                {error && <div style={{color:'red'}}>{error}</div>}
                <div>Enter New Message:
                    <input onChange={(e) => this.setState({newMessageText: e.target.value})}
                           placeholder='enter text'
                           value={newMessageText} />
                    <select
                        onChange={(e) => this.setState({newMessageUid: e.target.value})}
                        value={newMessageUid}>
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
