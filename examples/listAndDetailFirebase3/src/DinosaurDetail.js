import React, {Component} from 'react';

import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';

class DinosaurDetail extends Component {
    static getSubs(props, state) {
        const {stores, dinosaurKey} = props;
        const {store, authStore} = stores;
        return authStore.authUser() ? store.dinosaurDetailAndScoreSubs(dinosaurKey) : [];

        //NOTE: any observable values that are used here must also be used in render()!
        //This ensures the component will be re-rendered when those values change
        // and will therefore update its subs
    }
    static subscribeSubs(subs, props, state) {
        const {stores} = props;
        const {store} = stores;
        return store.subscribeSubs(subs);
    }

    renderField(field, val) {
        return (
            <div key={field}>
                {field}: {JSON.stringify(val)}
            </div>
        );
    }

    render() {
        const {stores, dinosaurKey} = this.props;
        const {store, authStore} = stores;

        const detail = store.detail(dinosaurKey);
        
        //NOTE: need this in render() because it's used by getSubs! (even if not needed by render() itself)
        const authUser = authStore.authUser();
        
        if (!authUser) {
            return null;
        }

        if (!detail) {
            return <div>Loading detail...</div>;
        }

        const score = store.score(dinosaurKey);

        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                <h3>{dinosaurKey}</h3>
                {score !== undefined && <div>Score: {score}</div>}
                <div>{detail.entries().map(entry => this.renderField(entry[0], entry[1]))}</div>
            </div>
        );
    }
}

export default autoSubscriber(observer(DinosaurDetail));
