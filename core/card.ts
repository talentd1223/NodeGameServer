import { SUIT } from "./types"

var values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
var suits = ['♠', '♥', '♣', '♦']
class Card {
    _suit: SUIT
    _value: number

    constructor(value: number) {
        this._suit = Math.floor(value / 13)
        this._value = Math.floor(value % 13)
        return this
    }

    toString () {
        return `${suits[this._suit]}${values[this._value]}`
    }
}

export default Card