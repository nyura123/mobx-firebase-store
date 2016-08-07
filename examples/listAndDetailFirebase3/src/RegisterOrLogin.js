import React, { Component } from 'react';

import {observer} from 'mobx-react';

class RegisterOrLogin extends Component {
    constructor(props) {
        super(props);
        this.state = {
            email: '',
            password: '',
            inProgress: null,
            localError: null
        }
        this.resetStateBound = this.resetState.bind(this);
    }

    //componentWillMount/Unmount - not used here, but can use these for routing on auth changes
    componentWillMount() {
        const {stores} = this.props;
        const {authStore} = stores;
        this.unwatchAuth = authStore.watchAuth(user => {
           console.log('watchAuth got user? '+(user?'true':'false')+': can perform an imperative action (for example, route to login if user is null)');
        }, error => {
            console.log('watchAuth error: '+JSON.stringify(error));
        });
    }
    componentWillUnmount() {
        if (this.unwatchAuth) {
            this.unwatchAuth();
            this.unwatchAuth = null;
        }
    }

    resetState() {
        this.setState({
            localError: null,
            inProgress: null,
            password: ''
        });
    }
    
    register() {
        const {email, password} = this.state;
        if (!email || !password) {
            this.setState({
                localError: 'Enter email and password'
            });
            return;
        }
        const {stores} = this.props;
        const {authStore} = stores;
        this.setState({inProgress: 'Registering...'}, () => {
            authStore.createUser({
                email,
                password
            }).then(this.resetStateBound).catch(this.resetStateBound);
        });
    }

    login() {
        const {email, password} = this.state;
        if (!email || !password) {
            this.setState({
                localError: 'Enter email and password'
            });
            return;
        }
        const {stores} = this.props;
        const {authStore} = stores;
        this.setState({inProgress: 'Logging In...'}, () => {
            authStore.signIn({
                email,
                password
            }).then(this.resetStateBound).catch(this.resetStateBound);
        });
    }

    logout() {
        const {stores} = this.props;
        const {authStore} = stores;

        this.setState({inProgress: 'Logging Out...'}, () => {
            authStore.signOut().then(this.resetStateBound);
        });
    }

    renderLoginForm() {
        const {email, password} = this.state;
        return (
          <div>
              <input value={email} onChange={e=>this.setState({email: e.target.value})} placeholder='email'/>
              <input value={password} onChange={e=>this.setState({password: e.target.value})} placeholder='password' type='password'/>
              <button onClick={() => this.login()}>Login</button>
              <button onClick={() => this.register()}>Register</button>
          </div>
        );
    }
    renderLogoutButton() {
        return (
            <div>
                <button onClick={() => this.logout()}>Log Out</button>
            </div>
        );
    }

    render() {
        const {localError, inProgress} = this.state;
        const {stores} = this.props;
        const {authStore} = stores;
        
        const {auth} = authStore;
        
        const {authUser, authError} = auth;
        
        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                {inProgress && <div>{inProgress}</div> }
                {localError && <div style={{backgroundColor:'red'}}>Error: {JSON.stringify(localError)}</div> }
                {authError && <div style={{backgroundColor:'red'}}>Error: {JSON.stringify(authError)}</div> }
                {authUser && <div>Signed in as {authUser.email}</div> }
                {!authUser && this.renderLoginForm() }
                {authUser && this.renderLogoutButton()}
            </div>
        );
    }
}

export default observer(RegisterOrLogin);
