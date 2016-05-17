import React, {Component} from 'react';

import {observer} from 'mobx-react';
import {autoSubscriber} from 'firebase-nest';

import DinosaurDetail from './DinosaurDetail';

class DinosaurList extends Component {
    static getSubs(props, state) {
        const {store} = props;
        return store.allDinosaursSubs();

        //NOTE: any observable values that are used here must also be used in render()!
        //This ensures the component will be re-rendered when those values change
        // and will therefore update its subs
    }
    static subscribeSubs(subs, props, state) {
        const {store} = props;
        return store.subscribeSubs(subs);
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
        const {store} = this.props;
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
        const {store} = this.props;

        const dinosaurs = store.all();

        if (!dinosaurs) {
            return <div>Loading all dinosaurs...</div>;
        }

        const {detailDinosaurKey} = this.state;

        return (
            <div>
                <div>Dinosaurs ({dinosaurs.size})</div>
                <ul>
                    {dinosaurs.entries().map(entry => this.renderRow(entry[0], entry[1]))}
                </ul>

                {detailDinosaurKey &&
                    <DinosaurDetail store={store} dinosaurKey={detailDinosaurKey}/>
                }
            </div>
        );
    }
}

export default autoSubscriber(observer(DinosaurList));
