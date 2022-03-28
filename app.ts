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
        this.games.push(
            new Game("default_room")
        )
    }

    getGameList() {
        return this.games.map((game) => game._id)
    }

    createGame(id: string) {
        let game: Game = new Game(id)
        this.games.push(game)

        return game
    }

    joinGame(game_id: string, player_id: string) {
        let game: Game = this.findGameById(game_id)
        let player: Player = this.findPlayerById(player_id)
        player.game_id = game_id
        game.join(player)
        return game.run()
    }

    leaveGame(game_id: string, player_id: string) {
        let game: Game = this.findGameById(game_id)
        let player: Player = this.findPlayerById(player_id)
        if(game) {
            game.leave(player)
            return game.run()
        }
    }

    addPlayer(id: string) {
        let ret = this.findPlayerById(id)
        
        if(ret === null) {
            ret = new Player(id)
            this.players.push(ret)
        }
        return ret
    }
    removePlayer(id: string) {
        let player_ndx = this.findPlayerNdxById(id)
        if (this.players[player_ndx].game_id) {
            this.leaveGame(this.players[player_ndx].game_id, id)
        }

        this.players.splice(player_ndx, 1)
        return this.players[player_ndx]?.game_id
    }

    findPlayerById(id: string) {
        let filtered: Player[] = this.players.filter((player: Player) => player._id === id)
        return filtered.length ? filtered[0] : null
    }
    findPlayerNdxById(id: string) {
        let ndx = 0
        for (let i = 0 ; i < this.players.length; i ++) {
            if (this.players[i]._id === id) {
                ndx = i
                break
            }
        }
        return ndx;
    }

    findGameById(id: string) {
        let filtered: Game[] = this.games.filter((game: Game) => game._id === id)
        return filtered.length ? filtered[0] : null
    }
}

export default App