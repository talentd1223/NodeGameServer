import Aedes, { SubscribePacket, Subscription } from 'aedes'
import 'dotenv/config'
import { createServer } from 'aedes-server-factory'

import App from './app'

const app = App.getInstance()
const aedes = Aedes()
const port = process.env.WS_PORT
const httpServer = createServer(aedes, { ws: true })


httpServer.listen(port, function () {
  console.log('websocket server listening on port ', port)
})

aedes.on('client', function (client) {
    if (client) {
        console.log(`Client ${client.id} Connected to ${aedes.id}` )
        let player = app.addPlayer(client.id)
      
        if (player._status === "lobby") {
          let sub: Subscription = {topic: "room", qos: 0}
          client.subscribe(sub, () => {})
        }
    }
})

aedes.on('publish', async function (packet, client) {
  if(client)
    console.log(`Client ${client.id} published "${packet.topic.toString()}" with payload "${packet.payload.toString()}"` )
})

aedes.on('subscribe', async function (subscriptions, client) {
  if (client){
    console.log(`Client subscribed "${ JSON.stringify(subscriptions[0])}"` )
  }
})