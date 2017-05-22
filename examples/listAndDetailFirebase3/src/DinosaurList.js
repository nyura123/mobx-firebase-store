import React, {Component} from 'react';

import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';
import SubscriptionGraph from '../../subscriptionGraph/subscriptionGraph';

import DinosaurDetail from './DinosaurDetail';

import RegisterOrLogin from './RegisterOrLogin';

class DinosaurList extends Component {
    static getSubs(props, state) {
        const {stores} = props;
        const {store, authStore} = stores;
        return authStore.authUser() ? store.allDinosaursSubs() : [];

        //NOTE: any observable values that are used here must also be used in render()!
        //This ensures the component will be re-rendered when those values change
        // and will therefore update its subs
    }

    //This can be static, or an instance method where you can use this.setState if you want to display subscription status like below
    subscribeSubs(subs, props, state) {
        const {stores} = props;
        const {store} = stores;
      
        //Returning subscribeSubsWithPromise allows autoSubscriber to track loading status and firebase fetch errors
        return store.subscribeSubsWithPromise(subs);
    }

    constructor(props) {
        super(props);
        this.state = {
            detailDinosaurKey: null
        }
    }

    toggleDetail(dinosaurKey) {
        this.setState({
            detailDinosaurKey: this.state.detailDinosaurKey == dinosaurKey ? null : dinosaurKey
        })
    }

    renderRow(dinosaurKey, dinosaurObj) {
        const {stores} = this.props;
        const {store} = stores;
        const score = store.score(dinosaurKey);
        return (
            <div key={dinosaurKey} style={{border:'1px steelblue solid', margin:2}}>
                <button onClick={()=>this.toggleDetail(dinosaurKey)}>Toggle Detail</button>
                <h5>{dinosaurKey}</h5>
                <span style={{margin:2}}>Height: {dinosaurObj.height}</span>
                {score !== undefined && <span>Score: {score}</span>}
            </div>
        );
    }

    render() {
        const {stores, subscriptionGraph} = this.props;
        const {store, authStore} = stores;

        const authUser = authStore.authUser();

        const { _autoSubscriberFetching: fetching, _autoSubscriberError: fetchError } = this.state;

        if (fetchError) {
            return <div style={{backgroundColor:"red"}}>{fetchError}</div>
        }

        const dinosaurs = store.all();

        const {detailDinosaurKey} = this.state;

        return (
            <div>
              <div style={{width:'30%',display:'inline-block'}}>
                <RegisterOrLogin stores={stores} />
                {!authUser && <div>Register or log in to display dinosaurs</div>}
                {fetching && <div>Fetching</div>}
                {dinosaurs &&
                <div>
                  <div>Dinosaurs ({dinosaurs.size})</div>
                  <ul>
                    {dinosaurs.entries().map(entry => this.renderRow(entry[0], entry[1]))}
                  </ul>
                </div>
                }
                {detailDinosaurKey &&
                <DinosaurDetail stores={stores} dinosaurKey={detailDinosaurKey}/>
                }
              </div>

              <div style={{width:'68%',display:'inline-block',verticalAlign:'top'}}>
                <h1>Subscription Graph</h1>
                <SubscriptionGraph graph={subscriptionGraph.get()} />
              </div>

            </div>
        );
    }
}

export default autoSubscriber(observer(DinosaurList));
