'use strict'
// 实例化WebSocketServer对象，监听8090端口
const WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 3456});

// 定义关键词数组
let wordArr = ['Monkey', 'Dog', 'Bear', 'Flower', 'Girl'];
let roomList = [{
    roomId:'',
    roomName:'',
    user:''
}];
let userList = new Map();
let rommUser = [];
wss.on('connection', (ws) => {
    console.log('connected.')
    ws.id = '000001';
    let rspJson = {
            respCode:'0000',
            respDesc:'请求成功',
            respAction:'',
            resultData:{}
        };
    let keyWord;
    let rommIndex;
    wss.clients.forEach((client) => {
        if (client == ws) {
            rspJson.respAction = 'Connected';
            rspJson.respDesc = '加入成功！'
            client.send(JSON.stringify(rspJson));
        }
    });

    // 当服务器接收到客户端传来的消息时
    // 通过reqAction做出不同事件响应
    ws.on('message', (message) => {
        console.log('received: %s', message);
        let data = JSON.parse(message);
        rspJson = {
            respCode:'0000',
            respDesc:'请求成功',
            respAction:'',
            resultData:{}
        }
        //根据发送的消息类型做不同处理
        switch(data.reqAction){
            case 'Login':
                let userInfo;
                let userId = data.reqData.userId;
                if(userList.has(userId)){
                    //该用户已存在
                    userInfo = userList.get(userId);
                }else{
                    //用户不存在
                    userInfo = {
                        userId:userId,
                        userName:data.reqData.userName,
                        userIcon:data.reqData.iconUrl,
                        userRoomInfo:''
                    }
                    userList.set(userId,userInfo);
                    wss.clients.forEach((client) => {
                        if (client == ws) {
                            rspJson.respAction = 'Login';
                            rspJson.respDesc = '登录成功！';
                            rspJson.resultData = userInfo;
                            client.send(JSON.stringify(rspJson));
                        }
                    });
                }
                ws.userInfo = userInfo;
                break;
            case 'CreateRoom': //新建房间
                rspJson.respAction = 'CreateRoom';
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
                    let roomId = roomList[roomList.length-1].roomId++;
                    //房间可以创建
                    roomList.push({
                        roomId:roomId,
                        roomName:roomName,
                        user:[ws]
                    });
                    roomIndex = roomList.length;
                    ws.userInfo.roomInfo = {
                        roomId:roomId,
                        roomName:roomName,
                        isOwner:true
                    }
                    //通知房间创建成功,并广播房间列表信息
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '房间创建成功！';
                    rspJson.respAction = data.reqAction;
                    rspJson.resultData.roomList = roomList;
                    wss.clients.forEach((client) => {
                        client.send(JSON.stringify(rspJson));
                    });
                }
            case 'JoinRoom':
                rspJson.respAction = 'JoinRoom';
                roomId = data.reqData.roomId;
                roomName = data.reqData.roomName;
                let roomHased = false;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomId == roomId){
                        roomHased = ture;
                        roomIndex = i;
                    }
                }
                if(nameHased){
                    //房间ID存在
                    ws.userInfo.roomInfo = {
                        roomId:roomId,
                        roomName:roomName
                    }
                    roomList[roomIndex].user.push(ws);
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '加入成功！';
                    rspJson.respAction = data.reqAction;
                    
                    for(var i=0;i<wss.clients.length;i++){
                        if(wss.clients[i].userInfo.roomInfo.roomId == roomId){
                            roomUser.push(wss.clients[i]);
                        }
                    }

                    rspJson.resultData = roomUser;
                    //向同房间的用户广播
                    wss.clients.forEach((client) => {
                        if (client.userInfo.roomInfo.roomId == roomId) {
                            client.send(JSON.stringify(rspJson));
                        }
                    });
                }else{
                    //房间不存在
                    rspJson.respCode = '0099';
                    rspJson.respDesc = '房间不存在！';
                    rspJson.respAction = data.reqAction;
                    wss.clients.forEach((client) => {
                        client.send(JSON.stringify(rspJson));
                    });
                }
            case 'Start':
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
            case 'Answer':
                let result;
                data.reqData.answer == keyWord ? result = true: result = false;
                console.log('答案:'+result);
                rspJson.respAction = 'Answer';
                rspJson.resultData.result = result;
                wss.clients.forEach((client) => {
                    client.send(JSON.stringify(rspJson));
                })
                break;
            case 'Draw':
                rspJson.respAction = 'Draw';
                rspJson.resultData.drawData = data.reqData.drawData;
                wss.clients.forEach((client) => {
                    if (client !== ws) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
                break;
            case 'LeaveRoom':
                rspJson.respAction = 'LeaveRoom';
                roomId = data.reqData.roomId;
                roomName = data.reqData.roomName;
                roomHased = false;
                /**
                 * 1、判断是否是最后一个人
                 * 2、判断是否是房主
                 * 3、成功退出
                 */
                
                if(roomList[roomIndex].user.length==1){
                    //是最后一个人,直接删除房间，并删除个人附带信息
                    roomList.splice(roomIndex,1);
                    ws.userInfo.roomInfo={

                    }
                }else{
                    //不是最后一个人
                    ws.userInfo.roomInfo={

                    }
                    for(var i =0;i<roomList[roomIndex].user.length;i++){
                        if(roomList[roomIndex].user[i] == ws){
                            if(ws.userInfo.roomInfo.isOwner){//是房主
                                roomList[roomIndex].user[i+1].userInfo.isOwner = true;
                                for(var i=0;i<wss.clients.length;i++){
                                    if(wss.clients[i] == roomList[roomIndex].user[i+1]){
                                        wss.clients[i].userInfo.isOwner = true;
                                    }
                                }
                            }else{//不是房主
                                
                            }
                            roomList[roomIndex].user.splice(i,1);
                        }
                    }                   
                }
                rspJson.respCode = '0000';
                rspJson.respDesc = '已离开';
                rspJson.respAction = data.reqAction;
                
                // for(var i=0;i<wss.clients.length;i++){
                //     if(wss.clients[i].userInfo.roomInfo.roomId == roomId){
                //         roomUser.push(wss.clients[i]);
                //     }
                // }

                rspJson.resultData = roomList[roomIndex].user;
                //向同房间的用户广播
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomId == roomId) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
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