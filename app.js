'use strict'
// 实例化WebSocketServer对象，监听8090端口
const WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 3456});

// 定义关键词数组
let wordArr = ['Monkey', 'Dog', 'Bear', 'Flower', 'Girl'];
//roomlist数据格式
// roomList = [{
//     roomId:'',
//     roomName:'',
//     user:'',
//     userCount:0
// }];
let roomList = [];
let userList = new Map();
let roomUser = [];
let keyWordList = new Map();
wss.on('connection', (ws) => {
    console.log('connected.')
    ws.id = '000001';
    let rspJson = {
            respCode:'0000',
            respDesc:'请求成功',
            respAction:'',
            resultData:{}
        };
    let roomIndex;
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
                    console.log('该用户已存在');
                }else{
                    //用户不存在
                    console.log('该用户为新用户！');
                    userInfo = {
                        userId:userId,
                        userName:data.reqData.userName,
                        userIcon:data.reqData.iconUrl,
                        userRoomInfo:''
                    }
                    userList.set(userId,userInfo);
                    
                }
                wss.clients.forEach((client) => {
                    if (client == ws) {
                        rspJson.respAction = 'Login';
                        rspJson.respDesc = '登录成功！';
                        rspJson.resultData = {
                            userInfo:userInfo,
                            roomList:roomList
                        };
                        client.send(JSON.stringify(rspJson));
                        console.log('send: %s', JSON.stringify(rspJson));
                    }
                });
                ws.userInfo = userInfo;
                break;
            case 'CreateRoom': //新建房间
                rspJson.respAction = 'CreateRoom';
                var roomName = data.reqData.roomName;
                let nameHased = false;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomName == roomName){
                        nameHased = true;
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
                    let roomId;
                    if(roomList.length==0){
                        roomId = '000001';
                    }else{
                        roomId = roomList[roomList.length-1].roomId++;
                    }
                    //房间可以创建
                    
                    
                    ws.userInfo.roomInfo = {
                        roomId:roomId,
                        roomName:roomName,
                        isOwner:true
                    }
                    roomIndex = roomList.length;
                    roomList.push({
                        roomId:roomId,
                        roomName:roomName,
                        user:[ws.userInfo],
                        userCount:0
                    });
                    //通知房间创建成功,并广播房间列表信息
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '房间创建成功！';
                    rspJson.respAction = data.reqAction;
                    rspJson.resultData.roomList = roomList;
                    rspJson.resultData.ownerInfo = ws.userInfo;
                    wss.clients.forEach((client) => {
                        console.log('send: %s', JSON.stringify(rspJson));
                        client.send(JSON.stringify(rspJson));
                    });
                }
                break;
            case 'JoinRoom':
                rspJson.respAction = 'JoinRoom';
                let roomId = data.reqData.roomId;
                var roomName = data.reqData.roomName;
                let roomHased = false;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomId == roomId){
                        roomHased = true;
                        roomIndex = i;
                    }
                }
                if(roomHased){
                    //房间ID存在
                    ws.userInfo.roomInfo = {
                        roomId:roomId,
                        roomName:roomName,
                        isOwner:false
                    }
                    roomList[roomIndex].user.push(ws.userInfo);
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '加入房间成功';
                    rspJson.respAction = data.reqAction;
                    rspJson.resultData.userList = roomList[roomIndex].user;
                    //向同房间的用户广播
                    wss.clients.forEach((client) => {
                        if (client.userInfo.roomInfo.roomId == roomId) {
                            client.send(JSON.stringify(rspJson));
                        }
                    });

                    //向房间内成员广播新用户列表
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '获取房间信息成功';
                    rspJson.respAction = "GetRoomInfo";
                    rspJson.resultData.userList = roomList[roomIndex].user;
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
                break;
            case 'GetRoomInfo':
                rspJson.respAction = 'GetRoomInfo';
                var roomName = data.reqData.roomName;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomName == roomName){
                        roomIndex = i;
                    }
                }
                //房间存在
                rspJson.respCode = '0000';
                rspJson.respDesc = '获取房间信息成功';
                rspJson.respAction = data.reqAction;
                rspJson.resultData.userList = roomList[roomIndex].user;
                wss.clients.forEach((client) => {
                    if (client == ws) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
                break;
            case 'Chat':
                rspJson.respAction = 'Chat';
                var roomName = data.reqData.roomInfo.roomName;
                var messageText = data.reqData.message;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomName == roomName){
                        roomIndex = i;
                    }
                }
                //房间存在
                rspJson.respCode = '0000';
                rspJson.respDesc = '成功';
                rspJson.respAction = data.reqAction;
                var rspdata = {
                    name:ws.userInfo.userName,
                    iconUrl:ws.userInfo.userIcon,
                    message:messageText,
                    isMe:false
                };
                rspJson.resultData = rspdata;
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName && client != ws) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
                break;
            case 'Start':
                rspJson.respAction = 'Start';
                // 开始时随机获取一个关键词
                let keyWord = ((arr) => {
                    let num = Math.floor(Math.random()*arr.length);
                    return arr[num]
                })(wordArr);

                rspJson.respAction = 'Start';
                var roomName = data.reqData.roomInfo.roomName;
                keyWordList.set(roomName,keyWord);
                //房间存在
                rspJson.respCode = '0000';
                rspJson.respDesc = '成功';
                rspJson.respAction = data.reqAction;
                rspJson.resultData.keyWord = keyWord;
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName) {
                        client.send(JSON.stringify(rspJson));
                    }
                });
                break;
            case 'Answer':
                rspJson.respAction = 'Answer';
                var roomName = data.reqData.roomInfo.roomName;
                let result;

                data.reqData.answer == keyWordList.get(roomName) ? result = true: result = false;
                console.log('答案:'+result);

                //房间存在
                rspJson.respCode = '0000';
                rspJson.respDesc = '成功';
                rspJson.respAction = data.reqAction;
                rspJson.resultData.result = result;
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName && ws == client) {
                        if(ws == client){
                            client.send(JSON.stringify(rspJson));
                        }else{

                        }
                    }
                });
                break;
            case 'Draw':
                var roomName = data.reqData.roomInfo.roomName;

                rspJson.respAction = 'Draw';
                rspJson.respCode = '0000';
                rspJson.respDesc = '成功';
                rspJson.respAction = data.reqAction;
                rspJson.resultData.drawData = data.reqData.drawData;

                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName && ws != client) {
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