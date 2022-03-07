import Card from '../core/card'

export const range = (n) => ([...Array(n).keys()])

export const shuffle = () => {
    let data:any[] = range(52)
    let index = 0;
    while (index < 52) {
        let pos = Math.floor(Math.random() * 52)
        // swap [index] with [pos]
        data.splice(pos, 1, data[index++])[0]
    }
    
    for (let i = 0; i < 52; i++) {
        data[i] = new Card(i)
    }
    return data
}