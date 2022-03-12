import Card from '../core/card'
import { SUIT } from '../core/types';

export const range = (n) => ([...Array(n).keys()])

export const shuffle = (is_diamond_trump: boolean) => {
    console.log("constructor")
    console.log(is_diamond_trump)

    let data:any[] = range(52)
    let index = 0;
    while (index < 100) {
        let pos = Math.floor(Math.random() * 52)
        // swap [index] with [pos]
        let new_pos = index % 52
        data[new_pos] = data.splice(pos, 1, data[new_pos])[0]
        index ++;
    }
    
    for (let i = 0; i < 52; i++) {
        data[i] = new Card(data[i], is_diamond_trump)
    }
    return data
}

/**
 * @param cards
 * @param book_suit 
 * @return 1 (first > second), -1 (first < second), 0(first = second)
 */
export const decide_winner = (cards: Card[], book_suit: SUIT) => {
    let winner_ndx = 0
    let max_val = 0
    for (let i = 0; i < cards.length; i++) {
        let value = cards[i]._value === 0 ? 13: cards[i]._value // set highest for ace
        
       if(cards[i]._suit !== book_suit) {
            // set value higher for spades, lower for other suits
            value = cards[i]._suit === SUIT.SPADE ? value + 100 : value - 100 
        }
        winner_ndx = value > max_val ? i : winner_ndx
        max_val = value > max_val ? value : max_val
    }

    return winner_ndx
}