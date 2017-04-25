'use strict'
// 实例化WebSocketServer对象，监听8090端口
const WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 3456});

// 定义关键词数组
let wordArr = ['Monkey', 'Dog', 'Bear', 'Flower', 'Girl'];

/**
 * roomlist数据格式
 * roomList = [{
 *     roomId:'',
 *     roomName:'',
 *     user:'',
 *     userCount:0
 * }];
 */

let roomList = []; //房间列表
let roomUser = []; //房间中的用户
let userList = new Map(); //用户列表 key:userId value:userInfo
let keyWordList = new Map(); //关键词 key:roomName value:keyWord

wss.on('connection', (ws) => {
    console.log('A client connected.')
    /**
     * respCode:请求返回码 0000 请求正确
     * respDesc:返回描述
     * respAction:接口(行为)名称
     * resultData:返回数据 Json格式
     */
    let rspJson = {
            respCode:'0000',
            respDesc:'请求成功',
            respAction:'',
            resultData:{}
        };
    let roomIndex; //当前房间在roomList中的索引号

    /**
     * 广播给客户端本身：加入成功
     */
    wss.clients.forEach((client) => {
        if (client == ws) {
            sendMessage('Connected',{},'加入成功');
            client.send(JSON.stringify(rspJson));
        }
    });

    /**
     * 响应客户端发来的message事件
     * message 客户端传送的数据
     * 根据message.reqAction的不同，响应不同的用户动作
     */
    ws.on('message', (message) => {
        console.log('received: %s', message);//收到的消息
        let data = JSON.parse(message);
        //根据发送的消息reqAction做不同处理
        switch(data.reqAction){
            case 'Login'://打开首页时，客户端连接成功后自动发送该事件，并附带用户信息
                let userInfo;
                let userId = data.reqData.userId;
                //判断当前用户是否已经存在，用于以后处理直接继承信息并继续游戏
                if(userList.has(userId)){
                    console.log('该用户已存在');
                    userInfo = userList.get(userId);
                }else{
                    console.log('该用户为新用户！');
                    userInfo = {
                        userId:userId,
                        userName:data.reqData.userName,
                        userIcon:data.reqData.iconUrl,
                        userRoomInfo:''
                    }
                    //userList中存储该用户信息
                    userList.set(userId,userInfo);
                }
                wss.clients.forEach((client) => {
                    if (client == ws) {//向该用户广播登陆成功
                        sendMessage('Login',{
                            userInfo:userInfo,
                            roomList:roomList
                        },'登录成功');
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
                    wss.clients.forEach((client) => {
                        if (client == ws) {
                            sendMessage(data.reqAction,{},'房间名已存在','0099');
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
                    wss.clients.forEach((client) => {
                        sendMessage(data.reqAction,{
                            roomList:roomList,
                            ownerInfo:ws.userInfo
                        },'房间创建成功');
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
                    //向同房间的用户广播
                    wss.clients.forEach((client) => {
                        if (client.userInfo.roomInfo.roomId == roomId) {
                            sendMessage(data.reqAction,{
                                userList:roomList[roomIndex].user
                            },'加入房间成功');
                            //向房间内成员广播新用户列表
                            sendMessage("GetRoomInfo",{
                                userList:roomList[roomIndex].user
                            },'获取房间信息成功');
                        }
                    });
                }else{
                    //房间不存在
                    wss.clients.forEach((client) => {
                        if(client == ws)sendMessage(data.reqAction,{},'房间不存在','0099');
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
                //获取房间信息
                wss.clients.forEach((client) => {
                    if (client == ws) {
                        sendMessage(data.reqAction,{
                            userList:roomList[roomIndex].user
                        },'获取房间信息成功');
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
                var rspdata = {
                    name:ws.userInfo.userName,
                    iconUrl:ws.userInfo.userIcon,
                    message:messageText,
                    isMe:false
                };
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName && client != ws) {
                        sendMessage(data.reqAction,rspdata);
                    }
                });
                break;
            case 'Start':
                var roomName = data.reqData.roomInfo.roomName;
                roomUser = [];
                //房间存在
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName) {
                        sendMessage(data.reqAction,{});
                        roomUser.push(client);
                    }
                });
                gameRun(roomUser,roomName);
                break;
            
            case 'Draw':
                var roomName = data.reqData.roomInfo.roomName;
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName && ws != client) {
                        sendMessage(data.reqAction,{
                            drawData:data.reqData.drawData
                        });
                    }
                });
                break;
            case 'LeaveRoom':
                rspJson.respAction = 'LeaveRoom';
                // roomId = data.reqData.roomId;
                var roomName = data.reqData.roomInfo.roomName;
                // var roomHased = false;
                for(var i = 0;i<roomList.length;i++){
                    if(roomList[i].roomName == roomName){
                        // roomHased = true;
                        roomIndex = i;
                    }
                }
                /**
                 * 1、判断是否是最后一个人
                 * 2、判断是否是房主
                 * 3、成功退出
                 */
                if(roomList[roomIndex].user.length==1){
                    //是最后一个人,直接删除房间，并删除个人附带信息
                    roomList.splice(roomIndex,1);
                    ws.userInfo.roomInfo='';
                }else{
                    //不是最后一个人
                    ws.userInfo.roomInfo='';
                    for(var i =0;i<roomList[roomIndex].user.length;i++){
                        if(roomList[roomIndex].user[i] == ws){
                            if(ws.userInfo.roomInfo.isOwner){//是房主
                                roomList[roomIndex].user[i+1].userInfo.isOwner = true;//设置下一个人是房主
                            }else{//不是房主
                                
                            }
                            roomList[roomIndex].user.splice(i,1);
                        }
                    }
                    //向同房间的用户广播
                    wss.clients.forEach((client) => {
                        if (client.userInfo.roomInfo.roomName == roomName) {
                            sendMessage(data.reqAction,{
                                userList:roomList[roomIndex].user
                            },'已离开');
                        }
                    });
                }
                //向不在房间内的人广播房间列表
                wss.clients.forEach((client) => {
                    if (!client.userInfo.roomInfo) {
                        sendMessage('RoomList',{
                            roomList:roomList
                        },'更新房间信息');
                    }
                });
                break;
            default:
                break;
        }
    });
    
    // 退出聊天  
    ws.on('close', function(close) {  
        
        // roomId = data.reqData.roomId;
        var roomName;
        if(ws.userInfo.roomInfo.roomName){
            roomName = ws.userInfo.roomInfo.roomName;
            for(var i = 0;i<roomList.length;i++){
                if(roomList[i].roomName == roomName){
                    roomIndex = i;
                }
            }
            /**
             * 1、判断是否是最后一个人
             * 2、判断是否是房主
             * 3、成功退出
             */
            if(roomList[roomIndex].user.length==1){
                //是最后一个人,直接删除房间，并删除个人附带信息
                roomList.splice(roomIndex,1);
                ws.userInfo.roomInfo='';
            }else{
                //不是最后一个人
                ws.userInfo.roomInfo='';
                for(var i =0;i<roomList[roomIndex].user.length;i++){
                    if(roomList[roomIndex].user[i] == ws){
                        if(ws.userInfo.roomInfo.isOwner){//是房主
                            roomList[roomIndex].user[i+1].userInfo.isOwner = true;//设置下一个人是房主
                        }else{//不是房主
                            
                        }
                        roomList[roomIndex].user.splice(i,1);
                    }
                }
                //向同房间的用户广播
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName) {
                        sendMessage(data.reqAction,{
                            userList:roomList[roomIndex].user
                        },'已离开');
                    }
                });
            }
            //向同房间的用户广播
            wss.clients.forEach((client) => {
                if (!client.userInfo.roomInfo) {
                    sendMessage('RoomList',{
                        roomList:roomList
                    },'更新房间信息');
                }
            });
        }
    });
    function gameRun(userArry, roomName){
        let Game = {};
        let playerList = [];
        let playerIndex = 0;
        let playerInfo;
        for(var i = 0;i<userArry.length;i++){
            playerList.push(userArry[i].userInfo);
        }
        let round = 1;
        ws.on('message', (message) => {
            console.log('received111111: %s', message);
            let data = JSON.parse(message);
            rspJson = {
                respCode:'0000',
                respDesc:'请求成功',
                respAction:'',
                resultData:{}
            }
            //根据发送的消息类型做不同处理
            switch(data.reqAction){
                case 'Answer':
                    rspJson.respAction = 'Answer';
                    var roomName = data.reqData.roomInfo.roomName;
                    let result;

                    data.reqData.answer == keyWordList.get(roomName) ? result = true: result = false;

                    console.log('答案:'+result);

                    rspJson.resultData= {};
                    if(result){
                        playerList[playerIndex].soccer++;
                    }
                    //房间存在
                    rspJson.respCode = '0000';
                    rspJson.respDesc = '成功';
                    rspJson.respAction = data.reqAction;
                    rspJson.resultData.result = result;
                    wss.clients.forEach((client) => {
                        if (client.userInfo.roomInfo.roomName == roomName && ws == client) {
                            if(ws == client){
                                rspJson.resultData.userInfo = playerList;
                                client.send(JSON.stringify(rspJson));
                            }else{
                                client.send(JSON.stringify(rspJson));
                            }
                        }
                    });
                    break;
                default:
                    break;
            }
        })
        Game.over = function(){
            clearTimeout(Game.timer);
            rspJson.respCode = '0000';
            rspJson.respDesc = '游戏结束';
            rspJson.respAction = 'GameOver';
            rspJson.resultData = {
                player:playerInfo
            };
            //向同房间的用户广播
            wss.clients.forEach((client) => {
                if (client.userInfo.roomInfo.roomName == roomName) {
                    client.send(JSON.stringify(rspJson));
                }
            });
        }

        Game.nextRound = function(){
            round++;
            if(round>3){
                Game.over();
            }else{
                playerIndex = 0;
                playerInfo = playerList[playerIndex];
                Game.nextPlayer();
            }            
        }
        
        

        let time;
        function timeFuc(){
            rspJson.respCode = '0000';
            rspJson.respDesc = '正在计时';
            rspJson.respAction = 'UpdateTime';
            rspJson.resultData = {
                time:time
            };
            //向同房间的用户广播
            wss.clients.forEach((client) => {
                if (client.userInfo.roomInfo.roomName == roomName) {
                    client.send(JSON.stringify(rspJson));
                }
            });
            time--;
            if(time<1) {
                playerIndex++;
                Game.nextPlayer();
            }else{
                Game.timer = setTimeout(function(){
                    timeFuc();
                },1000);
            }
        }
        Game.nextPlayer = function(){
            if(!playerList[playerIndex]){
                Game.nextRound();
            }else{
                playerInfo = playerList[playerIndex];
                // 开始时随机获取一个关键词
                let keyWord = ((arr) => {
                    let num = Math.floor(Math.random()*arr.length);
                    return arr[num]
                })(wordArr);
                keyWordList.set(roomName,keyWord);
                //清除上一次的计时
                clearTimeout(Game.timer);

                rspJson.respCode = '0000';
                rspJson.respDesc = '更换人员';
                rspJson.respAction = 'NextPlayer';
                rspJson.resultData = {
                    player:playerInfo
                };
                
                //向同房间的用户广播
                wss.clients.forEach((client) => {
                    if (client.userInfo.roomInfo.roomName == roomName) {
                        if(client.userInfo.userName == playerInfo.userName){
                            rspJson.resultData.keyWord = keyWord;
                        }
                        client.send(JSON.stringify(rspJson));
                    }
                });
                //开始计时
                time = 10;
                Game.timer = setTimeout(function(){
                    timeFuc();
                },1000);
            }
            
        }
        Game.nextPlayer();
    }
})
function sendMessage(action, data, desc, code ){
    let rspJson = {
        respCode:'0000',
        respAction:'Default',
        respDesc:'成功',
        resultData:{}
    }

    rspJson.respAction = action;
    rspJson.resultData = data;
    if(desc)rspJson.respDesc = desc;
    if(code)rspJson.respCode = code;
    client.send(JSON.stringify(rspJson));
    console.log('send: %s', JSON.stringify(rspJson));
}
