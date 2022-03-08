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
    _status: "lobby" | "inspect" | "idle" | "play"

    constructor(id: string) {
        this._id = id
        this._name = id
        this._status = "lobby"
    }

    public set cards( data: Card[]) {
        this._cards = data
    }

    public get is_dealer(){
        return this.position_from_dealer === 0
    }
}

export default Player