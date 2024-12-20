const patterns = [
    // Rows
    [[0, 0], [0, 1], [0, 2]],  // Top row
    [[1, 0], [1, 1], [1, 2]],  // Middle row
    [[2, 0], [2, 1], [2, 2]],  // Bottom row

    // Columns
    [[0, 0], [1, 0], [2, 0]],  // Left column
    [[0, 1], [1, 1], [2, 1]],  // Middle column
    [[0, 2], [1, 2], [2, 2]],  // Right column

    // Diagonals
    [[0, 0], [1, 1], [2, 2]],  // Top-left to bottom-right diagonal
    [[0, 2], [1, 1], [2, 0]]   // Top-right to bottom-left diagonal
]

const Player = function(name, marker) {
    return { name, marker }
}

const Computer = function(marker) {
    return { marker }
}

const player = Player("Lethargy", "X")
const computer = Computer("O")

const Players = [player, computer]

const PubSub = (function() {
    const events = {}

    const subscribe = function (eventName, callback) {
        if (typeof eventName !== 'string') {
            console.error('Event name must be a string')
            return
        }
        if (typeof callback !== 'function') {
            console.error('Callback must be a function')
            return
        }

        events[eventName] = events[eventName] || []
        events[eventName].push(callback)
    }

    const publish = function (eventName, data=null) {
        if (!events[eventName]) return
        
        events[eventName].forEach(callback => callback(data))
    }

    const unsubscribe = function (eventName, callback) {
        if (!events[eventName]) return

        events[eventName] = events[eventName].filter(subscriber => subscriber !== callback)
    }

    return { subscribe, publish, unsubscribe }
})()

const GameManager = (function() {
    const canvas = document.querySelector("canvas")
    const fps = 240
    canvas.width = 540
    canvas.height = 540
    const cellSize = canvas.width / 3
    const ctx = canvas.getContext("2d")
    let frameNo = 0
    let interval
    let canPlaceMarker = true
    
    const keys = { "ArrowUp": false, "ArrowDown": false, "ArrowRight": false, "ArrowLeft": false,
                   "w": false, "s": false, "a": false, "d": false }

    const markerMapping = {} // Maps each grid cell index to the marker currently on it (X or O).
    let currentObstacles = []

    const init = function() {
        bindEvents()
        interval = setInterval(Renderer.render, 1000 / fps) // Updates the game so that it runs at fps (the variable) frames per second.
        PubSub.subscribe("game:ended", endGame)
        console.log("Game started.")
    }

    const bindEvents = function() {
        window.addEventListener('keydown', function(e) {
            if (e.key === " " && canPlaceMarker) {
                PubSub.publish("marker:willplace")
                return
            }
            if (!Object.keys(keys).includes(e.key)) return
            keys[e.key] = true
            PubSub.publish("input:changed", keys)
        })
        window.addEventListener('keyup', function(e) {
            if (!Object.keys(keys).includes(e.key)) return

            keys[e.key] = false
            PubSub.publish("input:changed", keys)
        })
    }

    const endGame = function() {
        clearInterval(interval)
    }

    const getCanvasData = () => ({ canvas, cellSize, ctx })

    const getMarkerMapping = () => (markerMapping)

    const getObstacles = () => (currentObstacles)

    const setObstacles = (newObstacles) => (currentObstacles = newObstacles)

    const incFrames = () => frameNo++

    const getFrames = () => (frameNo)

    const getFps = () => (fps)

    const getKeys = () => (keys)

    const togglePlaceMarker = function(newOption) {
        canPlaceMarker = newOption
        console.log("canPlaceMarker: ", canPlaceMarker)
    }

    const changeMarkerMapping = (indexX, indexY) => {
        if(!markerMapping[[indexX, indexY]]) {
            const currentPlayer = TurnManager.getCurrentPlayer()
            markerMapping[[indexX, indexY]] = currentPlayer.marker
            return true
        }
        return false
    }

    return { init, getCanvasData, getMarkerMapping, getObstacles, incFrames, getFrames, changeMarkerMapping, setObstacles, getFps, getKeys, togglePlaceMarker, endGame }
})()

// Handles the rendering of the canvas.
const Renderer = (function() {
    const { canvas, cellSize, ctx } = GameManager.getCanvasData()

    const render = function () {
        GameManager.incFrames()
        ctx.clearRect(0, 0, canvas.width, canvas.height) // Clears the canvas
        renderMarkers()
        renderGrid()
        update(PlayerObj)
        updateObstacles()
        
        PlayerObj.move(GameManager.getKeys())
        PubSub.publish("rendering:ended", null)
    }

    const renderGrid = function() {
        const width = canvas.width
        const height = canvas.height
    
        ctx.strokeStyle = "#ddd"
        ctx.lineWidth = 1
    
        for (let x = 0; x <= width; x += cellSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
        }
        
        for (let y = 0; y <= height; y += cellSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
        }
    }

    const update = function(object) {
        const { x, y, size } = object.getSizes()
        ctx.fillStyle = object.getColor()
        ctx.fillRect(x, y, size, size)
    }

    const updateObstacles = function() {
            GameManager.getObstacles().forEach(obstacle => {
            obstacle.move()
            update(obstacle)
        })
    }
        
    const renderMarkers = function() {
        const markerMapping = GameManager.getMarkerMapping()
        const arr = Object.entries(markerMapping) // [['1,1' , 'X' ]]
        arr.forEach(cell => {
            let marker = Marker(cell[1], cell[0][0], cell[0][2]) // Marker('X', 1, 1)
            marker.draw()
        })
    }

    const data = () => ({ canvas, cellSize, ctx })

    return { data, render }

})()

const StateManager = (function() {

    const everyInterval = function(n) {
        if ((GameManager.getFrames() / n) % 1 === 0) { return true }
        return false
    }

    // Checks crashes, removes out of bound obstacles, and adds new obstacles.
    PubSub.subscribe("rendering:ended", () => {
        const canvas = GameManager.getCanvasData().canvas
        let obstacles = GameManager.getObstacles().filter(obstacle => {
            PlayerObj.crashWith(obstacle)
            const { x, y, size } = obstacle.getSizes()
            // Keeps the obstacle in the array only if it's still inside the canvas, effectively deleting the ones outside.
            return (x + size >= 0 && x <= canvas.width && y + size >= 0 && y <= canvas.height)
        })
        
        if (everyInterval(GameManager.getFps() / 4)) { // Creates a new obstacle every fps / 4 frames and on the first frame.
            const obstacle = Obstacle(20, 50, "green")
            obstacles.push(obstacle)
        }
        GameManager.setObstacles(obstacles)

    })    
})()

const PlayerObj = (function(size, color, posX, posY, speed) {
    let x = posX
    let y = posY
    const { canvas, cellSize } = GameManager.getCanvasData()
    const getSpeed = () => (speed)
    const getColor = () => (color)
    const getSizes = () => ({ x, y, size })

    const limit = function() {
        if (x < 0) x = 0 
        if (x + size > canvas.width) x = canvas.width - size
        if (y < 0) y = 0 
        if (y + size > canvas.height) y = canvas.height - size
    }

    const move = function(keys) {
        let speedX = 0
        let speedY = 0
        if (keys && (keys["ArrowLeft"] || keys["a"])) { speedX = -speed } // All this is to handle fluid movement in all 8 directions and update the player's location.
        if (keys && (keys["ArrowRight"] || keys["d"])) { speedX = speed }
        if (keys && (keys["ArrowUp"] || keys["w"])) { speedY = -speed }
        if (keys && (keys["ArrowDown"] || keys["s"])) { speedY = speed }
        x += speedX
        y += speedY
        limit()
    }

    const crashWith = function(otherObj) {
        const myleft = x
        const myright = x + (size)
        const mytop = y
        const mybottom = y + (size)
        
        const otherObjSizes = otherObj.getSizes()
        const otherleft = otherObjSizes.x
        const otherright = otherObjSizes.x + (otherObjSizes.size)
        const othertop = otherObjSizes.y
        const otherbottom = otherObjSizes.y + (otherObjSizes.size)

        let crash = true

        if ((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright)) crash = false
       
        if (crash) {
            PubSub.publish("game:ended", null)
        }
    }

    const checkCell = function() {
        const centerX = x + size / 2 // The X coord for the center of the player = x coord of the top left corner + half its width
        const centerY = y + size / 2 // The same applies here but vertically.

        // Finds which "range" (aka cell) the player is standing on in each axis based on the argument passed.
        const findRange = function(center) {
            for (let i = 0; i < 3; i++) {
                if (center > (i * cellSize) && center <= ((i + 1) * cellSize)) return i
            }
        }
        
        return { indexX: findRange(centerX), indexY: findRange(centerY) }
    }

    return { getColor, getSizes, crashWith, checkCell, move }

})(30, "red", 270 - 15, 270 - 15, 1) 

function Obstacle(min, max, color, direction="") {
    const canvas = Renderer.data().canvas
    const minSpeed = 0.5
    const maxSpeed = 1.5
    const directions = ["right", "left", "top", "bottom"] // Obstacle possible directions
    const size = Math.random() * (max - min) + min // Picks a random size for the obstacle based on the specified range.
    let x = 0 
    let y = 0
    let speedX = 0
    let speedY = 0
    direction = direction || directions[Math.floor(Math.random() * directions.length)] // Picks a random direction for the obstacle if not specified.
    
    const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed // Picks a random speed based on the specified range.
    const getSpeed = () => (speed)
    const getColor = () => (color)
    const getSizes = () => ({ x, y, size })

    // Picks a random value between two specified values.
    const rand = function(r1, r2) {
        return Math.random() * (r2 - r1) + r1
    }

    // Picks a random spawn coordinate and speed based on the direction specified.
    const generateSpawnLocation = function() {
        switch(direction) {
            case "right": 
                y = rand(0, canvas.height - size) // There is always some offset to prevent the obstacles from partially (or even fully) spawning outside of the canvas.
                x = 0
                speedX = speed
                break
            case "left": 
                y = rand(0, canvas.height - size)
                x = canvas.width - size
                speedX = -speed
                break
            case "bottom": 
                y = 0
                x = rand(0, canvas.width - size)
                speedY = speed
                break
            case "top": 
                y = canvas.height - size
                x = rand(0, canvas.width - size)
                speedY = -speed
                break
        }
    }

    generateSpawnLocation()

    const move = function() {
        x += speedX
        y += speedY
    }
    // Borrows those methods from the component factory.
    
    return { getColor, getSizes, move, getSpeed }
}

function Marker(type, indexX, indexY) {
    const { canvas, cellSize, ctx } = Renderer.data()
    const offset = 35 //  To prevent them from being too big.

    // Draws an X on the provided cell.
    const drawX = function() {
        const x = indexX * cellSize
        const y = indexY * cellSize
        
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x + offset, y + offset)
        ctx.lineTo(x + cellSize - offset, y + cellSize - offset)
        ctx.moveTo(x + cellSize - offset, y + offset)
        ctx.lineTo(x + offset, y + cellSize - offset)
        ctx.stroke()
    }

    const drawO = function() {
        const x = cellSize * indexX + cellSize * 0.5
        const y = cellSize * indexY + cellSize * 0.5

        ctx.lineWidth = 3
        ctx.strokeStyle = "#ddd"

        ctx.beginPath()
        ctx.arc(x, y, cellSize * 0.5 - offset, 0, 2 * Math.PI)
        ctx.stroke()
    }

    // Returns a drawing function based on the provided arguments.
    return { draw: (type === "X" ? drawX : drawO) }
}

const TurnManager = (function() {
    let turns = 1
    let currentPlayer = player

    const pickPlayer = function() {
        currentPlayer = Players[turns % 2]
        turns++
    }

    const getCurrentPlayer = () => (currentPlayer)


    // Triggered when anybody places a marker.
    PubSub.subscribe("marker:placed", () => {
        checkWin() // Checks if somebody won.
        pickPlayer() // Picks the next player.

        // If the (human) player is picked, the next turn is their's after 3s. Increases the difficulty :p
        if (currentPlayer === player) {
            setTimeout(() => PubSub.publish("turn:player"), 3000)
        }
        else {
            GameManager.togglePlaceMarker(false) // Prevents the (human) player from playing.
            setTimeout(() => PubSub.publish("turn:computer"), 3000) // Computer's turn after 3s. Raises difficulty as well.
        }
    })

    // Allows the player to place a marker after the 3s have passed.
    PubSub.subscribe("turn:player", () => {
        GameManager.togglePlaceMarker(true)
    })


    // Computer's actions.
    PubSub.subscribe("turn:computer", () => {
        const markerMapping = GameManager.getMarkerMapping()
        AI.makeRandomMove(markerMapping)
    })    

    // Checks if the player can even place a marker on the cell they're on before publishing the event of placing.
    PubSub.subscribe("marker:willplace", () => {
        const { indexX, indexY } = PlayerObj.checkCell()
        if (GameManager.changeMarkerMapping(indexX, indexY)) PubSub.publish("marker:placed")
        
    })

    // Checks if somebody's won based on the hardcoded patterns.
    const checkWin = function() {
        const board = GameManager.getMarkerMapping()
        for (let marker of ['X', 'O']) {
            if (patterns.some(pattern => 
                pattern.every(([x, y]) => board[`${x},${y}`] === marker)
            )) {
                console.log(marker.toUpperCase(), "WON")
                // Stops the game after everything is rendered in order to give the game a chance to render the final move.
                PubSub.subscribe("rendering:ended", GameManager.endGame) 
            }
        }
        return null // No winner yet.
    }

    return { getCurrentPlayer }
})()

// The AI. Currently picks random moves. Might add minimax later.
const AI = (function() {
    const makeRandomMove = function(markerMapping) {
        const emptyCells = []
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let coords = `${i},${j}`
                if (!markerMapping[coords]) {
                    emptyCells.push([i, j])
                }
            }
        }
        if (emptyCells.length > 0) {
            const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
            GameManager.changeMarkerMapping(x, y)
            console.log("AI picked a random move: ", x, y)
            PubSub.publish("marker:placed")
            return true
        }
        return false
    }


    return { makeRandomMove }

})()

GameManager.init()


/* TODO

-Add minimax.
-Add UI.
-Add the ability to chose your marker.
-Add the ability to restart.

*/