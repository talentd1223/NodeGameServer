import Aedes, { PublishPacket, SubscribePacket, Subscription } from 'aedes'
import 'dotenv/config'
import { createServer } from 'aedes-server-factory'

import App from './app'
import Card from './core/card'

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
  let result = null
  switch(topic) {
    case "games": // get game list
      response.payload = app.getGameList().toString()
      break
    default: // joined game -> get game info and leave lobby
      let game = app.findGameById(topic)

      if(game.isDuplicated(client.id))
        return
      
      result = app.joinGame(topic, client.id)
      client.unsubscribe({topic: 'games', qos: 0}, () => {})
      
      response.payload = JSON.stringify(app.findGameById(topic))
      break
  }
  console.log(response)
  aedes.publish( response as PublishPacket, () => {})
  handleRunResult(result, topic)
}

function handleRunResult(result, game_id) {
  if ( !result ) return
  let packet: PublishPacket = {topic: game_id, payload: ""} as PublishPacket
  let game = app.findGameById(game_id)
  let payload = {cmd: result.cmd}
  switch (result.cmd) {
    case "deal":
      payload['dealer_ndx'] = game.dealer_ndx
      break
    default:
      break
  }

  packet.payload = JSON.stringify(payload)
  console.log(packet)
  aedes.publish(packet, () => {})
}

aedes.on('client', function (client) {
    if (client) {
      if (app.findPlayerById(client.id)) {
        return
      }
      console.log(`Client ${client.id} Connected to ${aedes.id}` )
      
      let player = app.addPlayer(client.id)
      if (player._status === "lobby") {
        let sub: Subscription = {topic: "games", qos: 0}
        client.subscribe(sub, () => {})
      }
    }
})

function handleClientPublish(payload, client_id, game_id) {
  let game = app.findGameById(game_id)
  let player = app.findPlayerById(client_id)
  let packet = {topic: game_id, payload: ""} as PublishPacket
  let p_payload = null

  switch(payload.cmd) {
    case "bid_ready":
      player._status = 'bid_ready'
      p_payload = game.run()
      break
    case "card_open":
      let cards = player.cards
      let p = JSON.stringify({cmd: "cards", cards: cards})
      aedes.publish({topic: `${game_id}_${client_id}`, payload: p } as PublishPacket, () => {})
      break
    case "bid":
      player._status = 'idle'
      game.bid(payload.bid_amount)
      p_payload = game.run()
      break
    case "book":
      player._status = 'idle'
      let card: Card = new Card(0, game.is_diamond_trump)
      card._suit = Number(payload.card.split("-")[0])
      card._value = Number(payload.card.split("-")[1])
      game.book(card)
      
      p_payload = game.run()
      break

    default:
      break
  }
  console.log("handleClientPublish")
  console.log(p_payload)

  if (p_payload) {
    packet.payload = JSON.stringify(p_payload)
  
    console.log("handleClientPublish")
    console.log(packet)
    aedes.publish(packet, () => {})
  }
}
aedes.on('publish', async function (packet, client) {
  if(client) {
    console.log(`Client ${client.id} published "${packet.topic.toString()}" with payload "${packet.payload.toString()}"` )

    var message = JSON.parse(packet.payload.toString())
    handleClientPublish(message, client.id, packet.topic.toString())
  }
})

aedes.on('subscribe', async function (subscriptions, client) {
  if (client){
    let subscription = subscriptions[0]
    for (let i = 0; i < subscriptions.length; i++) {
      console.log(`Client ${client.id} subscribed "${ JSON.stringify(subscriptions[i])}"` )
    }

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
      app.leaveGame(subscription, client.id)
      let game = app.findGameById(subscription)
      aedes.publish({topic: game._id, payload: JSON.stringify(game)} as PublishPacket, () => {})
    }
  }
})