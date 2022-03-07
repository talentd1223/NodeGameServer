import Game from "./core/game"
import Player from "./core/player"

class App {
    static _instance:App
    static getInstance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new App();
        return this._instance;
    }

    games: Game[] = []
    players: Player[] = []
    
    constructor() {
    }

    getGameList() {
        return this.games.map((game) => game._id)
    }

    createRoom(id: string) {
        let game: Game = new Game(id)
        this.games.push(game)
    }

    addPlayer(id: string) {
        let ret = null
        let filtered = this.players.filter((player) => player._id === id)
        
        if(!filtered.length) {
            ret = this.players.push(new Player(id))
        } else {
            ret = filtered[0]
        }

        return ret
    }
}

export default App