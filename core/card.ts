import { SUIT } from "./types"

var values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
var suits = ['♠', '♥', '♣', '♦']
class Card {
    _suit: SUIT
    _value: number

    constructor(value: number, is_diamond_trump?: boolean) {
        this._suit = Math.floor(value / 13)
        this._value = Math.floor(value % 13)

        if (this._value === 1) {
            switch (this._suit) {
                case SUIT.CLUB:
                    this._value = 17
                    break
                case SUIT.HEART:
                    this._value = 16
                    break
                case SUIT.DIAMOND:
                    this._value = is_diamond_trump ? 15 : 14
                    break
                default:
                    this._value = is_diamond_trump ? 14 : 15
                    break
            }
            this._suit = SUIT.SPADE
        }
        return this
    }

    toString () {
        let result = `${this._suit}-${this._value}`
        return result
    }
}

export default Card