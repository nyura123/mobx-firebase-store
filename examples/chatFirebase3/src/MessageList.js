import React, {Component} from 'react';

import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';

import RegisterOrLogin from './RegisterOrLogin';

/*
 Display messages and users for each message
 */

const dateFmtOptions = {
    weekday: 'long', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit'
};
const dateLocale = 'en-US';

class MessageList extends Component {
    static getSubs(props, state) {
        const { stores } = props;

        const { chatStore, authStore } = stores;
        return authStore.authUser() ? chatStore.allMsgsSubs().concat(chatStore.allUsersSubs()) : [];
    }

    //make this an instance method to set fetching state
    subscribeSubs(subs, props, state) {
        const {stores} = props;
        const {chatStore} = stores;

        const {unsubscribe, promise} = chatStore.subscribeSubsWithPromise(subs);
        this.setState({fetching: true, error: null}, () => {
            promise.then(
              () => this.setState({fetching: false}),
              (error) => this.setState({fetching: false, error})
            );
        });

        return unsubscribe;
    }

    constructor(props) {
        super(props);
        this.state = {
            newMessageText: '',
            error: null,
            fetching: false,
            newMessageUid: 'cookiemonster'
        };
        this.addMessage = this.addMessage.bind(this);
    }

    deleteMessage(messageKey) {
        const {stores} = this.props;
        const {chatStore} = stores;

        chatStore.deleteMessage(messageKey)
          .catch((error) => {
            this.setState({error});
        });
    }

    addMessage() {
        const { newMessageText, newMessageUid } = this.state;
        if (!newMessageText || !newMessageUid) {
            this.setState({error: 'missing text or user selection'});
            return;
        }

        const {stores} = this.props;
        const {chatStore} = stores;
        
        chatStore.addMessage({
            text: newMessageText,
            timestamp: new Date().getTime(),
            uid: newMessageUid
        })
        .then(() => {
            //Clear field
            this.setState({newMessageText: ''})
        })
        .catch((error) => {
            //Clear field and show error
            this.setState({error, newMessageText: ''});
        });
    }

    renderMessage(messageKey, messageData) {
        const {stores} = this.props;
        const {chatStore} = stores;
        
        const user = chatStore.user(messageData.uid);

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
        const { stores } = this.props;
        const { chatStore } = stores;

        const users = chatStore.allUsers();
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
        const { stores } = this.props;
        const { chatStore, authStore } = stores;

        //NOTE: need this in render() because it's used by getSubs! (even if not needed by render() itself)
        const authUser = authStore.authUser();

        const messages = chatStore.allMsgs();
        const numMessages = messages ? messages.keys().length : 0;

        const { newMessageText, newMessageUid, error, fetching } = this.state;

        return (
            <div>
                {error && <div style={{color:'red'}}>{error}</div>}

                <RegisterOrLogin stores={stores}/>

                {!authUser && <div>Register or log in to display messages</div>}

                {authUser &&
                <div>

                    <div>Enter New Message:
                        <input onChange={(e) => this.setState({newMessageText: e.target.value})}
                               placeholder='enter text'
                               value={newMessageText}/>
                        <select
                          onChange={(e) => this.setState({newMessageUid: e.target.value})}
                          value={newMessageUid}>
                            <option value=''>Select User</option>
                            {this.renderUsersOptions()}
                        </select>
                        <button onClick={this.addMessage}>Send</button>
                    </div>
                    {fetching &&
                    <div>Loading messages and users...</div>
                    }
                    {messages &&
                    <div>
                        Messages:
                        {messages.keys().map(messageKey => this.renderMessage(messageKey, messages.get(messageKey)))}
                    </div>
                    }
                    {messages && numMessages == 0 &&
                    <h4 style={{color:'grey'}}>No Messages Yet</h4>
                    }
                </div>
                }

            </div>
        );
    }
}

export default autoSubscriber(observer(MessageList));
