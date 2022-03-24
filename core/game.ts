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

    current_booker_ndx: number // position for the current booker id
    round_id: number // current round id
    round_scores: number[][][] // [[score, bags], [score, bags]] stands for record for individual rounds

    books: Card[]
    books_taken: number[]
    spade_broken: boolean
    book_suit: SUIT
    
    is_diamond_trump: boolean
    
    score_limit: number

    constructor(_id: string, is_diamond_trump?: boolean) {
        this._id = _id;
        this._players = []
        this.round_id = 0
        this.current_booker_ndx = 1
        this.round_scores = []
        this._bids= [null, null, null, null]
        this.books_taken= [0, 0, 0, 0]
        this.books= [null, null, null, null]
        this._status = GAME_STATUS.NOT_READY
        this.spade_broken = false
        this.is_diamond_trump = true
        this.score_limit = 200
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
        let player_ndx = (this.dealerNdx + player.position_from_dealer) % 4
        this._players.splice(player_ndx, 1)
    }

    bid(value: number) {
        if (value === -1 && this._status === GAME_STATUS.BLIND_BID) {
            // blind bid rejected, team member's blind bid set as null
            this._bids[ (this.current_booker_ndx + 2) % 2] = null
        } else {
            this._bids[ this.current_booker_ndx ] = value > 0 ? value: 0
        }

        this.current_booker_ndx = (this.current_booker_ndx + 1) % 4
    }

    book(value: Card) {
        if (this.availableCards.find((item: Card) => item._suit === value._suit && item._value === value._value)) {
            this.books[this.current_booker_ndx] = value
            
            if (this.books.filter(i => i).length === 1) {
                this.book_suit = value._suit
            }
            this.currentPlayer.removeCard(value)
            this.current_booker_ndx = (this.current_booker_ndx + 1) % 4
        }
    }

    deckShuffle() {
        let cards = shuffle(this.is_diamond_trump)
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
        if (!this.isEnoughPlayers) {
            this._status = GAME_STATUS.NOT_READY
        } else if ( this.isGameReady) {
            
            this._status = GAME_STATUS.READY
            this.setGameParameters()

            return {cmd: "deal", dealer_ndx: this.dealerNdx}
        } else if (this._status === GAME_STATUS.READY) {

            if (this.allBidReady) {

                this.deckShuffle()

                if(this.someCanBlindBid) {
                    this._status = GAME_STATUS.BLIND_BID
                    let bid_ndx = this.curBlindBidSeat

                    return {cmd: "blind_bid_req", bid_ndx: bid_ndx, bid_id: this._players[bid_ndx]._id, min: 0, max: 13}
                }
                else {
                    return this.enterBidStatus()
                }
            }
        }
        else if (this._status === GAME_STATUS.BLIND_BID) {
            let bid_ndx = this.curBlindBidSeat
            let prevTeamBid = this._bids[(bid_ndx + 2) % 4]

            if (this.canBlindBid(bid_ndx) && prevTeamBid !== null && this._bids[bid_ndx] === null) {
                let min = prevTeamBid > 6 ? 0 : 6 - prevTeamBid
                let max = 13
                return {cmd: "blind_bid_req", bid_ndx: bid_ndx, bid_id: this._players[bid_ndx]._id, min: min, max: max}
            } else {
                return this.enterBidStatus()
            }
        } else if(this._status === GAME_STATUS.BID) {
            
            if (this._bids.some(val => val === null)) {
                
                let min = this._bids[(this.current_booker_ndx + 2) % 4]
                let max = 13 - min > 10 ? 10 : 13 - min
                min = min === null ? 0 : 4 - min
                
                let ret ={cmd: "bid_req", cards: this.currentPlayer.cards, bid_id: this.currentPlayer._id, bid_ndx: this.current_booker_ndx, min, max}
                if(this._bids[this.current_booker_ndx] !== null) {
                    ret["bid_amount"] = this._bids[this.current_booker_ndx]
                }
                return ret;
            } else {
                this._status = GAME_STATUS.BOOK
                return {cmd: "book_req", available: this.availableCards, booker_id: this.currentPlayer._id}
            }
        } else if (this._status === GAME_STATUS.BOOK) {
            let ret = {cmd: "book_req"}
            if (this.isBookOver) {
                this.finalizeBook()
                ret['book_taken'] = this.books_taken

                if(this.availableCards.length === 0) {
                    this.round_scores.push([this.get_round_result(0), this.get_round_result(1)])
                    return this.decideRoundResult()
                }
            }
            let result = {...ret, available: this.availableCards, booker_id: this.currentPlayer._id}
            return result
        }
        return null
    }

    public enterBidStatus() {
        this._status = GAME_STATUS.BID
        this.current_booker_ndx = (this.dealerNdx + 1) % 4
        let ret ={cmd: "bid_req", cards: this.currentPlayer.cards, bid_id: this.currentPlayer._id, bid_ndx: this.current_booker_ndx}
        if(this._bids[this.current_booker_ndx] !== null) {
            ret["bid_amount"] = this._bids[this.current_booker_ndx]
        }
        return ret
    }

    public decideRoundResult() {
        let score_0 = this.getTeamScore(0)
        let score_1 = this.getTeamScore(1)
        this._bids= [null, null, null, null]
        this.books_taken= [0, 0, 0, 0]
        this.spade_broken = false

        if (Math.abs(score_1) >= this.score_limit || Math.abs(score_0) >= this.score_limit) {
            let winner = score_0 > score_1 ? `${this._players[0]._name} & ${this._players[2]._name}`: `${this._players[1]._name} & ${this._players[3]._name}`; 
            this._status = GAME_STATUS.GAME_OVER
            return {cmd: "game_result", data: this.round_scores, winner: winner}
        } else {
            this._status = GAME_STATUS.ROUND_OVER
            this.round_id ++
            this.current_booker_ndx = this.dealerNdx
            return {cmd: "round_result", data: this.round_scores}
        }
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

    public getTeamScore(team_ndx) {
        team_ndx = team_ndx % 2
        let score = 0
        for (let i = 0; i < this.round_scores.length; i++) {
            score += this.round_scores[i][team_ndx][0]
        }
        return score
    }
    
    public setGameParameters() {
        for ( let i = 0; i < this._players.length; i++) {
            let player = this._players[i]
            player.position_from_dealer = (i - this.dealerNdx + 4) % 4
            player.team_id = i % 2
            player.team_name = `${player._id} & ${this._players[(i + 2) % 4]._id}`
        }
    } 

    public finalizeBook() {
        // 1) decide winner & record taken book
        let winner_ndx = decide_winner(this.books, this.book_suit)
        this.books_taken[winner_ndx] ++

        // 2) decide spade is broken
        this.spade_broken = this.books[winner_ndx]._suit === SUIT.SPADE || this.spade_broken

        // 3) reset books
        this.current_booker_ndx = winner_ndx
        this.books = [null, null, null, null]
    }

    public get isEnoughPlayers(): boolean {
        return this._players.length === 4
    }

    public get isGameReady(): boolean {
        let isValidStatus: boolean = this._status === GAME_STATUS.NOT_READY || this._status === GAME_STATUS.ROUND_OVER

        return this.isEnoughPlayers && isValidStatus
    }

    public get allBidReady() {
        return this._players.every((player: Player) => player._status === 'bid_ready')
    }
    
    public get someCanBlindBid(): boolean {
        return this.canBlindBid(0) || this.canBlindBid(1)
    }

    public get curBlindBidSeat(): number {
        if (!this.canBlindBid(this.current_booker_ndx)) {
            this.current_booker_ndx = (this.current_booker_ndx + 1) % 4;
        }
        return this.current_booker_ndx
    }
    public get availableCards(): Card[] {
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

        if (this.isBookStarted && cards[0]._suit === SUIT.SPADE) {
            this.spade_broken = true
        }
        return cards
    }

    public canBlindBid(player_ndx: number): boolean {
        if (this.getTeamScore(player_ndx) < this.getTeamScore(player_ndx + 1) - 100) {
            return true 
        }
        else
            return false
    }
    public get dealerNdx(): number {
        return this.round_id % 4
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

    public get arePlayersReady(): boolean {
        return this._players.every(player => player._status === 'round_ready')
    }
}

export default Game