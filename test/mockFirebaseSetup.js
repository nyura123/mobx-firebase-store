
import originalWebsocket from 'faye-websocket';
import mockery from 'mockery';

export default function setup() {
// Firebase has strict requirements about the hostname format. So we provide a dummy
// hostname and then change the URL to localhost inside the faye-websocket's Client
// constructor.
    const websocketMock = Object.assign({}, originalWebsocket, {
        Client: function (url) {
            //console.log("url="+url);
            url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost').replace('wss://', 'ws://');
            return new originalWebsocket.Client(url);
        }
    });

    mockery.registerMock('faye-websocket', websocketMock);
    mockery.enable({
        warnOnUnregistered: false
    });

    return mockery;
}