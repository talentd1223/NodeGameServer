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
     *  READY // players all entered, must request bid for each player
     *  
     *  ROUND_START // bid finished, shuffle card, distributed to each player
     *  
     *  ROUND_PLAY // players throw card on the table until no cards in hand
     *  
     *  ROUND_OVER // check if game is over
     *  
     */
    _bids: number[]

    dealer_id: number // dealer position
    current_turn: number // position for the current turn
    constructor(_id: string) {
      this._id = _id;
      this._players = []
    }

    join(player: Player) {
        if (this._players.length < 4 && !this.isDuplicated(player)) {
            this._players.push(player)
        }
    }

    isDuplicated(player: Player) {
        return this._players.filter((item: Player) => item._id === player._id).length !== 0
    }

    leave(player: Player) {
        this._players = this._players.filter(p => p._id !== player._id)
    }

    book(value: number) {
        this._bids.push(value)
    }

    deckShuffle() {
        let cards = shuffle()
        let ret:Card[][] = [[], [], [], []]
        for (let i = 0; i < cards.length; i++) {
            ret[i % 4].push(new Card(cards[i]))
        }
        
        for (let i = 0; i < 4; i ++) {
            this._players[i].cards = ret[i]
        }
    }

    updateStatus () {
        if (this._status === GAME_STATUS.NOT_READY && this._players.length === 4)
            this._status = GAME_STATUS.READY
        else if (this._status === GAME_STATUS.PLAY && this._players[(3 + this.dealer_id) % 4].cards.length === 0)
            this._status = GAME_STATUS.ROUND_OVER
    }
}

export default Game