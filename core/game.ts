import Player from './player'
import { shuffle, decide_winner } from '../helper/utils'
import Card from './card'

import {GAME_STATUS, SUIT} from './types'
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

    books: Card[]
    books_taken: number[]
    spade_broken: boolean
    book_suit: SUIT

    constructor(_id: string) {
        this._id = _id;
        this._players = []
        this.round_id = 0
        this.dealer_ndx = 3
        this.current_booker_ndx = this.prev_book_winner = 0
        this.round_scores = [[[], []]]
        this._bids= [null, null, null, null]
        this.books_taken= [0, 0, 0, 0]
        this.books= [null, null, null, null]
        this._status = GAME_STATUS.NOT_READY
        this.spade_broken = false
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

    book(value: Card) {
        if (this.availableCards.find((item: Card) => item._suit === value._suit && item._value === value._value)) {
            this.books[this.current_booker_ndx] = value
            
            if (this.books.filter(i => i).length === 1) {
                // first book, set suit
                this.book_suit = value._suit
            }
            this.currentPlayer.removeCard(value)
            this.current_booker_ndx = (this.current_booker_ndx + 1) % 4
        }
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
                return {cmd: "blind_bid_req", bid_ndx: this.current_booker_ndx, bid_id: this._players[this.current_booker_ndx]._id, min: 0, max: 10}
            }
        } else if(this._status === GAME_STATUS.BID) {
            
            if (this._bids.some(val => val === null)) {
                let min = this._bids[(this.current_booker_ndx + 2) % 4]
                let max = 13 - min > 10 ? 10 : 13 - min
                min = min === null ? 0 : 4 - min
                return {cmd: "blind_bid_req", bid_ndx: this.current_booker_ndx, bid_id: this._players[this.current_booker_ndx]._id, min: min, max: max}
            }
            else {
                // Invalid Bid
                if(this._bids.reduce( (a, b) => a + b) < 10) {
                    // shuffle again and restart bidding
                    this.deckShuffle()
                    this._bids = [null, null, null, null]
                    return {cmd: "blind_bid_req", bid_ndx: this.current_booker_ndx, bid_id: this._players[this.current_booker_ndx]._id, min: 0, max: 10}
                } else {
                    this._status = GAME_STATUS.BOOK
                    console.log(`prev_book_winner: ${this.prev_book_winner}, current_booker_ndx: ${this.current_booker_ndx}`)
                    this.prev_book_winner = this.current_booker_ndx
                    return {cmd: "book_req", available: this.availableCards, booker_id: this.currentPlayer._id}
                }
            }
        } else if (this._status === GAME_STATUS.BOOK) {
            let ret = {cmd: "book_req"}

            if (this.isBookOver) {
                this.finalizeBook()
                ret['book_taken'] = this.books_taken

                if(this.availableCards.length === 0) {
                    this.round_scores.push([this.get_round_result(0), this.get_round_result(1)])
                    this._status = GAME_STATUS.NOT_READY
                    return {cmd: "round_result", data: this.round_scores}
                }
            }
            let result = {...ret, available: this.availableCards, booker_id: this.currentPlayer._id}
            return result
        } 
        // else if (this._status === GAME_STATUS.ROUND_OVER) {
        //     // round_scores: number[][][] // [[score, bags], [score, bags]] stands for record for individual rounds
        //     this.round_scores.push([this.get_round_result(0), this.get_round_result(1)])
        //     this._status = GAME_STATUS.NOT_READY
        //     return {cmd: "round_result", data: this.round_scores}
        // }
        return null
    }

    public get_round_result(team_id: 0 | 1) : number[]{
        let bids = this._bids[team_id] + this._bids[team_id + 2]
        let taken = this.books_taken[team_id] + this.books_taken[team_id + 2]

        if (taken >= bids) {
            return [bids * 10 + taken - bids, taken - bids]
        } else {
            return [-bids * 10, 0]
        }
    }

    public finalizeBook() {
        // 1) decide winner & record taken book
        let winner_ndx = decide_winner(this.books, this.book_suit)
        this.prev_book_winner = winner_ndx
        this.books_taken[winner_ndx] ++

        // 2) decide spade is broken
        this.spade_broken = this.books[winner_ndx]._suit === SUIT.SPADE || this.spade_broken

        // 3) reset books
        this.current_booker_ndx = winner_ndx
        this.books = [null, null, null, null]
    }

    public get availableCards(): Card[] {
        console.log(this.currentPlayer._cards)
        console.log("this.isBookStarted: " + this.isBookStarted)
        console.log("book_suit: " + this.book_suit)
        console.log("currentHaveBookSuit: " + this.currentHaveBookSuit)

        let cards = this.currentPlayer._cards.filter((card: Card)=> {
            let ret = true
            // when book just started
            if(this.isBookStarted) {
                ret = this.spade_broken || card._suit !== SUIT.SPADE 
            } else if(this.currentHaveBookSuit) {
                // when current player have matching suit
                ret = card._suit === this.book_suit
            }

            return ret
        })

        return cards
    }

    public get currentPlayer(): Player {
        return this._players[this.current_booker_ndx]
    }

    public get currentHaveBookSuit() {
        return this.currentPlayer._cards.some((card: Card) => card._suit === this.book_suit)
    }

    public get isBookOver(): boolean {
        return this.books.every(book => book !== null)
    }
    public get isBookStarted(): boolean {
        return this.books.every(book => book === null)
    }
}

export default Game