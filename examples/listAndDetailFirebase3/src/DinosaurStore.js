
import MobxFirebaseStore, {primitiveKey} from 'mobx-firebase-store';

import firebase from 'firebase';

const detailStr = 'dinosaurDetail_';
const scoreStr = 'dinosaurScore_';
const allStr = 'allDinosaurs';

export default class DinosaurStore extends MobxFirebaseStore {
    constructor() {
        super(firebase.database().ref());
    }

    //getters
    detail(dinosaurKey) {
        return this.getData(detailStr + dinosaurKey);
    }
    
    score(dinosaurKey) {
        //primitive value
        const scoreNode = this.getData(scoreStr + dinosaurKey);
        if (!scoreNode) return undefined;
        return scoreNode.get(primitiveKey);
    }
    
    all() {
        return this.getData(allStr)
    }

    //subs -- all paths should be relative to config.fbUrl
    dinosaurDetailSubs(dinosaurKey) {
        return [{
            subKey: detailStr + dinosaurKey,
            asValue: true,

            path: 'dinosaurs/' + dinosaurKey
        }]
    }
    
    dinosaurScoreSubs(dinosaurKey) {
        return [{
            subKey: scoreStr + dinosaurKey,
            asValue: true,
            path: 'scores/' + dinosaurKey
        }]
    }
    
    dinosaurDetailAndScoreSubs(dinosaurKey) {
        let subs = this.dinosaurDetailSubs(dinosaurKey);
        subs = subs.concat(this.dinosaurScoreSubs(dinosaurKey));
        return subs;
    }
    
    allDinosaursSubs() {
        return [{
            subKey: allStr,
            asList: true,
            childSubs: this.dinosaurScoreSubs.bind(this),
            path: 'dinosaurs'
        }]
    }
}