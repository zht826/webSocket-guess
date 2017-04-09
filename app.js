'use strict'
// 实例化WebSocketServer对象，监听8090端口
const WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 8090})
 
// 定义关键词数组
let wordArr = ['Monkey', 'Dog', 'Bear', 'Flower', 'Girl']
 
wss.on('connection', (ws) => {
    console.log('connected.')
    
    // 随机获取一个关键词
    let keyWord = ((arr) => {
            let num = Math.floor(Math.random()*arr.length)
            return arr[num]
        })(wordArr)
        
    // 当服务器接收到客户端传来的消息时
    // 判断消息内容与关键词是否相等
    // 同时向所有客户端派发消息
    ws.on('message', (message) => {
        console.log('received: %s', message)
        if (message == keyWord) {
            console.log('correct')
            wss.clients.forEach((client) => {
                client.send('答对了！！')
            })
        } else {
            console.log('wrong')
            wss.clients.forEach((client) => {
                if (client !== ws) {
                    client.send(message);
                }
            })
            
        }
    })
    
    // 服务器初始化时即向客户端提供一个关键词
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({'keyword':keyWord}))
    })
})