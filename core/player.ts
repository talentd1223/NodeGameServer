import Card from "./card"

class Player {
    _id: string
    _name: string
    _avatar: string
    team_id: number
    team_name: string
    position_from_dealer: number
    // _seat_id: 0 | 1 | 2 | 3
    // _bid_amount: number
    // _tricks_taken: number
    _cards: Card[]
    _status: "lobby" | "idle" | "play" | "bid_ready"

    constructor(id: string) {
        this._id = id
        this._name = id
        this._status = "lobby"
    }

    public removeCard(card: Card) {
        this._cards = this._cards.filter((value) => !(value._suit === card._suit && value._value === card._value))
    }

    public set cards( data: Card[]) {
        this._cards = data
    }

    public get cards() {
        let data = []
        for(let i = 0; i <this._cards.length; i++) {
            data.push(this._cards[i].toString())
        }

        return data.sort( )
    }

    public get is_dealer(){
        return this.position_from_dealer === 0
    }
}

export default Player