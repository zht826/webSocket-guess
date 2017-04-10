'use strict'
// 实例化WebSocketServer对象，监听8090端口
const WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 3456});

// 定义关键词数组
let wordArr = ['Monkey', 'Dog', 'Bear', 'Flower', 'Girl'];
let roomList = [{
    roomId:'',
    roomName:''
}];
let userList = new map();

wss.on('connection', (ws) => {
    console.log('connected.')
    ws.id = '000001';
    // console.log(wss);
    let rspJson = {
            respCode:'0000',
            respDesc:'请求成功',
            respAction:'',
            resultData:{}
        };
    let keyWord;
    wss.clients.forEach((client) => {
        // if (client == ws) {
            console.log(client);
            rspJson.respDesc = '加入成功！'
            client.send(JSON.stringify(rspJson));
        // }
    });
    // 当服务器接收到客户端传来的消息时
    // 判断消息内容与关键词是否相等
    // 同时向所有客户端派发消息
    ws.on('message', (message) => {
        console.log('received: %s', message);
        data = JSON.parse(message);
        rspJson = {
            respCode:'0000',
            respDesc:'请求成功',
            respAction:'',
            resultData:{}
        }
        //根据发送的消息类型做不同处理
        switch(data.reqAction){
            case createRoom: //新建房间
                rspJson.respAction = 'createRoom';
                let roomName = data.reqData.roomName;
                let nameHased = false;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomName == roomName){
                        nameHased = ture;
                    }
                }
                if(nameHased){
                    //房间名已存在
                    rspJson.respCode = '0099';
                    rspJson.respDesc = '房间名已存在！';
                    rspJson.respAction = data.reqAction;
                    wss.clients.forEach((client) => {
                        if (client == ws) {
                            client.send(JSON.stringify(rspJson));
                        }
                    });
                }else{
                    //房间可以创建
                    roomList.push({
                        roomId:roomList.length,
                        roomName:roomName
                    });
                    //通知房间创建成功,并广播房间列表信息
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '房间创建成功！';
                    rspJson.respAction = data.reqAction;
                    rspJson.resultData.roomList = roomList;
                    wss.clients.forEach((client) => {
                        client.send(JSON.stringify(rspJson));
                    });
                }
            case Start:
                rspJson.respAction = 'Start';
                // 开始时随机获取一个关键词
                keyWord = ((arr) => {
                    let num = Math.floor(Math.random()*arr.length);
                    return arr[num]
                })(wordArr);
                rspJson.respAction = 'Start';
                rspJson.resultData.keyWord = keyWord;
                // 开始时即向客户端提供一个关键词
                wss.clients.forEach((client) => {
                    client.send(JSON.stringify(rspJson));
                });
            case Answer:
                let result;
                data.reqData.answer == keyWord ? result = true: result = false;
                console.log('答案:'+result);
                rspJson.respAction = 'Answer';
                rspJson.resultData.result = result;
                wss.clients.forEach((client) => {
                    client.send(JSON.stringify(rspJson));
                })
                break;
            case Draw:
                rspJson.respAction = 'Draw';
                rspJson.resultData.drawData = data.reqData.drawData;
                wss.clients.forEach((client) => {
                    if (client !== ws) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
                break;
            default:
                rspJson.respCode = '0001';
                rspJson.respDesc = '接口不存在！';
                wss.clients.forEach((client) => {
                    if (client == ws) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
        }
    })
    
    
})