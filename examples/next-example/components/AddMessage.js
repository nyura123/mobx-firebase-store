import React, {PropTypes} from 'react'

import { inject, observer } from 'mobx-react'
import { createAutoSubscriber } from 'firebase-nest'
import { allUsersSubs } from '../store'

@observer
class AddMessage extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  state = {
    error: null,
    newMessageText: '',
    newMessageUid: ''
  }

  renderUsersOptions() {
    const users = this.props.store.allUsers()
    if (!users) return null
    return users.entries().map(entry => {
      const uid = entry[0]
      const userData = entry[1]
      return (
        <option key={uid} value={uid}>
          {userData.first}{' '}{userData.last}
        </option>
      )
    })
  }

  render() {
    const { error, newMessageText, newMessageUid } = this.state

    return (
      <div>
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
          <button onClick={this.addMessage}>Send</button>
        </div>
        <button onClick={this.addMany}>Add 1000 - performance test</button>
        <button onClick={this.deleteAll}>Delete all</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </div>
    )
  }

  addMessage = () => {
    const {newMessageText, newMessageUid} = this.state
    if (!newMessageText || !newMessageUid) {
      this.setState({error: 'missing text or user selection'})
      return
    }

    this.setState({error: null}, () => {
      this.props.store.addMessage({
        text: newMessageText,
        timestamp: new Date().getTime(),
        uid: newMessageUid
      })
        .then(() => this.setState({newMessageText: ''}))
        .catch((error) => {
          this.setState({error: error.code, newMessageText: ''})
        })
    })
  }

  addMany = () => {
    let {newMessageUid} = this.state
    newMessageUid = newMessageUid || 'cookiemonster'

    this.setState({error: null}, () => {
      this.props.store.addMessagesTimes(newMessageUid, 1000, new Date().getTime())
        .catch((error) => {
          this.setState({error: error.code})
        })
    })
  }

  deleteAll = () => {
    this.setState({error: null}, () => {
      this.props.store.deleteAll()
        .catch((error) => {
          this.setState({error: error.code})
        })
    })
  }
}

export default inject('store')(createAutoSubscriber({
  getSubs: allUsersSubs,
  subscribeSubs: (subs, props, state) => props.store.subscribeSubsWithPromise(subs).unsubscribe
})(AddMessage))
