import Player from './player'
import { shuffle } from '../helper/utils'
import Card from './card'

import {GAME_STATUS} from './types'
class Game {
    _id: string
    _players: Player[]
    _status: GAME_STATUS
    /**
     *  NOT READY // not enough players
     *  
     *  READY // players all entered, start deal
     *  
     *  ROUND_START // bid finished, shuffle card, distributed to each player
     *  
     *  ROUND_PLAY // players throw card on the table until no cards in hand
     *  
     *  ROUND_OVER // check if game is over
     *  
     */
    _bids: number[]

    dealer_ndx: number // dealer position
    current_booker_ndx: number // position for the current booker id
    prev_book_winner: number // equal to position where current booking started
    round_id: number // current round id
    round_scores: number[][][] // [[score, bags], [score, bags]] stands for record for individual rounds

    constructor(_id: string) {
        this._id = _id;
        this._players = []
        this.round_id = 0
        this.dealer_ndx = 3
        this.current_booker_ndx = this.prev_book_winner = 0
        this.round_scores = [[[], []]]
        this._bids= [null, null, null, null]
        this._status = GAME_STATUS.NOT_READY
    }

    join(player: Player) {
        if (this._players.length < 4 && !this.isDuplicated(player)) {
            player._status = "idle"
            this._players.push(player)
        }
    }

    isDuplicated(player: Player) {
        return this._players.filter((item: Player) => item._id === player._id).length !== 0
    }

    leave(player: Player) {
        let player_ndx = (this.dealer_ndx + player.position_from_dealer) % 4
        this._players.splice(player_ndx, 1)
    }

    bid(value: number) {
        this._bids[ this.current_booker_ndx ] = (value)
        this.current_booker_ndx = (this.current_booker_ndx + 1) % 4
    }

    deckShuffle() {
        let cards = shuffle()
        let ret:Card[][] = [[], [], [], []]
        for (let i = 0; i < cards.length; i++) {
            ret[i % 4].push(cards[i])
        }
        
        for (let i = 0; i < 4; i ++) {
            this._players[i].cards = ret[i]
        }
    }

    run() {
        // responsible for updating status and do the necessary acts and return the next action
        if (this._players.length !== 4) {
            this._status = GAME_STATUS.NOT_READY
        } else if (this._status === GAME_STATUS.NOT_READY && this._players.length === 4) {
            // game start, set dealer_ndx
            this._status = GAME_STATUS.READY
            for ( let i = 0; i < this._players.length; i++) {
                let player = this._players[i]
                player.position_from_dealer = (i - this.dealer_ndx + 4) % 4
                player.team_id = i % 2
                player.team_name = `${player._id} & ${this._players[(i + 2) % 4]._id}`
            }

            // order client to show deal animation
            return {cmd: "deal", dealer_ndx: this.dealer_ndx}
        } else if (this._status === GAME_STATUS.READY) {
            let bid_ready = true
            for (let i = 0 ; i < this._players.length; i ++) {
                bid_ready = bid_ready && this._players[i]._status === 'bid_ready'
            }

            if (bid_ready) {
                this.deckShuffle()

                this._status = GAME_STATUS.BID
                return {cmd: "blind_bid_req", bid_ndx: this.current_booker_ndx, bid_id: this._players[this.current_booker_ndx]._id}
            }
        } else if(this._status === GAME_STATUS.BID) {
            
            console.log("this.current_booker_ndx:   " + this.current_booker_ndx)
            
            console.log(this._bids)
            if (this._bids.some(val => val === null))
                return {cmd: "blind_bid_req", bid_ndx: this.current_booker_ndx, bid_id: this._players[this.current_booker_ndx]._id}
            else {
                this._status = GAME_STATUS.ROUND_START
            }
        }
        return null
    }
}

export default Game