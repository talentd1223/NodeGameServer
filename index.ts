import Aedes, { PublishPacket, SubscribePacket, Subscription } from 'aedes'
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

function handleSubscribe(topic, client, payload = "") {
  let response = {
    topic: topic,
    payload: ""
  }
  switch(topic) {
    case "games": // get game list
      response.payload = app.getGameList().toString()
      break
    default: // joined game -> get game info and leave lobby
      app.joinGame(topic, client.id)
      response.payload = JSON.stringify(app.findGameById(topic))

      client.unsubscribe({topic: 'games', qos: 0}, () => {})
      break      
  }

  console.log(response)
  aedes.publish( response as PublishPacket, () => {})
}

aedes.on('client', function (client) {
    if (client) {
        console.log(`Client ${client.id} Connected to ${aedes.id}` )
        
        let player = app.addPlayer(client.id)
        if (player._status === "lobby") {
          let sub: Subscription = {topic: "games", qos: 0}
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
    let subscription = subscriptions[0]
    console.log(`Client ${client.id} subscribed "${ JSON.stringify(subscription)}"` )
    handleSubscribe(subscription.topic, client)
  }
})

aedes.on('unsubscribe', async function (subscriptions, client) {
  if (client){
    let subscription = JSON.parse(JSON.stringify(subscriptions[0])).topic
    subscription = subscription ? subscription:subscriptions[0]

    console.log(`Client ${client.id} unsubscribed "${JSON.stringify(subscription)}"` )

    if (subscription === "games") {
      // pass
    } else {
      console.log("leave")

      // leave game
      app.leaveGame(subscription, client.id)
      let game = app.findGameById(subscription)
      aedes.publish({topic: game._id, payload: JSON.stringify(game)} as PublishPacket, () => {})
    }
  }
})