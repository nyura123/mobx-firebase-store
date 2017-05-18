import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {observer} from 'mobx-react'

@observer
export default class RegisterOrLogin extends Component {
    static propTypes = {
        authStore: PropTypes.object.isRequired
    }

    state = {
        email: '',
        password: '',
        inProgress: null,
        localError: null
    }

    resetState = (authError) => {
        this.setState({
            localError: null,
            inProgress: null,
            password: '',
            authError
        })
    }
    
    register() {
        const {email, password} = this.state
        if (!email || !password) {
            this.setState({
                localError: 'Enter email and password'
            })
            return
        }
        const {authStore} = this.props
        this.setState({inProgress: 'Registering...'}, () => {
            authStore.createUser({
                email,
                password
            })
              .then(() => this.resetState())
              .catch(error => this.resetState(error))
        })
    }

    login() {
        const {email, password} = this.state
        if (!email || !password) {
            this.setState({
                localError: 'Enter email and password'
            })
            return
        }
        const {authStore} = this.props
        this.setState({inProgress: 'Logging In...'}, () => {
            authStore.signIn({
                email,
                password
            })
              .then(() => this.resetState())
              .catch(error => this.resetState(error))
        })
    }

    logout() {
        const { authStore } = this.props

        this.setState({inProgress: 'Logging Out...'}, () => {
            authStore.signOut()
              .then(() => this.resetState())
              .catch(error => this.resetState(error))
        })
    }

    renderLoginForm() {
        const {email, password} = this.state
        return (
          <div>
              <input value={email} onChange={e=>this.setState({email: e.target.value})} placeholder='email'/>
              <input value={password} onChange={e=>this.setState({password: e.target.value})} placeholder='password' type='password'/>
              <button onClick={() => this.login()}>Login</button>
              <button onClick={() => this.register()}>Register</button>
          </div>
        )
    }
    renderLogoutButton() {
        return (
            <div>
                <button onClick={() => this.logout()}>Log Out</button>
            </div>
        )
    }

    render() {
        const {localError, inProgress, authError} = this.state
        const {authStore} = this.props

        if (!authStore) {
            console.log('no auth?? ')
        }
        const authUser = authStore ? authStore.authUser() : null
        
        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                {inProgress && <div>{inProgress}</div> }
                {localError && <div style={{backgroundColor:'red'}}>{localError}</div> }
                {authError && <div style={{backgroundColor:'red'}}>API Error: {JSON.stringify(authError)}</div> }
                {authUser && <div>Signed in as {authUser.email}</div> }
                {!authUser && this.renderLoginForm() }
                {authUser && this.renderLogoutButton()}
            </div>
        )
    }
}
