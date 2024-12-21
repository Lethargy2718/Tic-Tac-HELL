const Player = function(name) {
    let marker = null
    const setMarker = function(newMarker) { marker = newMarker }
    const getMarker = () => (marker)
    return { name, setMarker, getMarker }
}

const player = Player("Player")
const computer = Player("AI")

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
        if (events[eventName].includes(callback)) return
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

const UIManager = (function() {
    const mainText = document.querySelector("#text1 > h1")
    const dialogSettings = document.querySelector("#dialogSettings")
    const dialogHelp = document.querySelector("#dialogHelp")
    const submitButton = document.querySelector("#submit")
    const closeSettingsButton = document.querySelector("#cancel")
    const closeHelpButton = document.querySelector("#closeHelp")
    const cog = document.querySelector(".fa-cog")
    const question = document.querySelector(".fa-question")
    const markerEl = document.querySelector("#marker")
    const aiDiffEl = document.querySelector("#ai-difficulty")
    const obsDiffEl = document.querySelector("#obstacle-difficulty")

    PubSub.subscribe("text:changed", (newText) => {
        mainText.textContent = newText
    })

    cog.addEventListener("click", () => {
        if (GameManager.getGameRunning()) return
        dialogSettings.showModal()
        dialogSettings.classList.add("show")
    })

    closeSettingsButton.addEventListener("click", () => {
        dialogSettings.classList.remove("show")
        dialogSettings.close()
    })

    submitButton.addEventListener("click", (e) => {
        e.preventDefault()
        dialogSettings.classList.remove("show")
        dialogSettings.close()
        GameManager.init()
    })

    question.addEventListener("click", () => {
        dialogHelp.showModal()
        dialogHelp.classList.add("show")
    })

    closeHelpButton.addEventListener("click", () => {
        dialogHelp.close()
        dialogHelp.classList.remove("show")
    })

    const getInput = function() {
        return { marker: markerEl.value, aiDiff: aiDiffEl.value, obsDiff: obsDiffEl.value }
    }

    return { getInput }
})()

const GameManager = (function() {
    const canvas = document.querySelector("canvas")
    canvas.width = 540
    canvas.height = 540
    const cellSize = canvas.width / 3
    const ctx = canvas.getContext("2d")
    let canPlaceMarker
    let gameRunning = false
    let boundEvents = false
    let secondsPassed
    let oldTimeStamp
    let fps
    let frameNo = 0
    
    const keys = { "ArrowUp": false, "ArrowDown": false, "ArrowRight": false, "ArrowLeft": false,
                   "w": false, "s": false, "a": false, "d": false }

    const markerMapping = [
        ["","",""],
        ["","",""],
        ["","",""]
    ]
    let currentObstacles = []

    const init = function() {
        currentObstacles = []
        PubSub.subscribe("game:ended", endGame)
        AI.setScores()
        PlayerObj.resetPos()
        bindEvents()
        player.setMarker(UIManager.getInput().marker)
        computer.setMarker(player.getMarker() === "X" ? "O" : "X")
        canPlaceMarker = player.getMarker() === "X" ? true : false
        PubSub.publish("text:changed", (
            `${player.getMarker() === "X" ? player.name : computer.name }'S TURN`
        ))
        if (player.getMarker() === "O") PubSub.publish("marker:placed")
        gameRunning = true
        window.requestAnimationFrame(gameLoop)
    }

    const gameLoop = function(timeStamp) {
        if (!gameRunning) return
        secondsPassed = Math.min((timeStamp - oldTimeStamp) / 1000, 0.1)
        oldTimeStamp = timeStamp
        fps = Math.round(1 / secondsPassed)
        frameNo++
        Renderer.render()
        window.requestAnimationFrame(gameLoop)
    }

    const bindEvents = function() {
        if (boundEvents) return

        window.addEventListener('keydown', function(e) {
            if (e.key === "q") {
                if (GameManager.getGameRunning()) {
                    PubSub.publish("game:ended")
                    PubSub.publish("text:changed", ("PRESS Q TO RESTART"))
                }
                else {
                    GameManager.init()
                }
            }
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

        boundEvents = true
    }

    const endGame = function() {
        frameNo = 0
        markerMapping.forEach((row, i) => markerMapping[i] = ["","",""])
        Object.keys(keys).forEach(key => keys[key] = false)
        canPlaceMarker = false
        gameRunning = false
    }
    const getCanvasData = () => ({ canvas, cellSize, ctx })

    const getMarkerMapping = () => (markerMapping)

    const getObstacles = () => (currentObstacles)

    const setObstacles = (newObstacles) => (currentObstacles = newObstacles)

    const getFrames = () => (frameNo)

    const getFps = () => (fps)

    const getKeys = () => (keys)

    const getGameRunning = () => (gameRunning)

    const getSeconds = () => (secondsPassed)

    const getTotalTime = () => (oldTimeStamp)

    const togglePlaceMarker = function(newOption) {
        canPlaceMarker = newOption
    }

    const changeMarkerMapping = (x, y) => {
        if(!markerMapping[x][y]) {
            const currentPlayer = TurnManager.getCurrentPlayer()
            markerMapping[x][y] = currentPlayer.getMarker()
            return true
        }
        return false
    }

    return { getTotalTime, getSeconds, bindEvents, init, getCanvasData, getMarkerMapping, getObstacles, getFrames, changeMarkerMapping, setObstacles, getFps, getKeys, togglePlaceMarker, endGame, getGameRunning }
})()

// Handles the rendering of the canvas.
const Renderer = (function() {
    const { canvas, cellSize, ctx } = GameManager.getCanvasData()

    const render = function () {
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
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const marker = markerMapping[i][j]
                Marker(marker, i, j).draw()
            }
        }
    }
    
    const data = () => ({ canvas, cellSize, ctx })

    return { data, render }

})()

const StateManager = (function() {
    const difficulties = {
        "normal": {minSize: 20, maxSize: 30, minSpeed: 120, maxSpeed: 200, frequency: 0.5},
        "hard": {minSize: 20, maxSize: 40, minSpeed: 200, maxSpeed: 400, frequency: 0.25},
        "impossible": {minSize: 20, maxSize: 40, minSpeed: 270, maxSpeed: 440, frequency: 0.15}
    }

    // Returns true every n seconds.
    const everyInterval = function(n) {
        const totalSecondsPassed = GameManager.getTotalTime() / 1000
        
        // Check if the time that has passed is a multiple of n seconds
        if (Math.floor(totalSecondsPassed / n) > Math.floor((totalSecondsPassed - GameManager.getSeconds()) / n)) {
            return true
        }
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
        
        let dif = difficulties[UIManager.getInput().obsDiff] // Creates a new obstacle every fps / 4 frames and on the first frame.
        if (everyInterval(dif.frequency)) {
            // console.log(dif.seconds, "Passed. spawning an obstacle")
            const obstacle = Obstacle(dif.minSize, dif.maxSize, dif.minSpeed, dif.maxSpeed, "green")
            obstacles.push(obstacle)
        }
        GameManager.setObstacles(obstacles)
    })
})()

const PlayerObj = (function(size, color, posX, posY, speed) {
    let x = posX
    let y = posY
    const { canvas, cellSize } = GameManager.getCanvasData()
    const getColor = () => (color)
    const getSizes = () => ({ x, y, size })

    const limit = function() {
        if (x < 0) x = 0 
        if (x + size > canvas.width) x = canvas.width - size
        if (y < 0) y = 0 
        if (y + size > canvas.height) y = canvas.height - size
    }

    const move = function(keys) {
        const secondsPassed = GameManager.getSeconds() || 0
        let speedX = 0
        let speedY = 0
        if (keys && (keys["ArrowLeft"] || keys["a"])) { speedX = -speed } // All this is to handle fluid movement in all 8 directions and update the player's location.
        if (keys && (keys["ArrowRight"] || keys["d"])) { speedX = speed }
        if (keys && (keys["ArrowUp"] || keys["w"])) { speedY = -speed }
        if (keys && (keys["ArrowDown"] || keys["s"])) { speedY = speed }
        x += (speedX * secondsPassed)
        y += (speedY * secondsPassed)
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
            PubSub.publish("text:changed", ("YOU DIED"))
            PubSub.publish("game:ended")
        }
    }

    const checkCell = function() {
        const centerX = x + size / 2 // The X coord for the center of the player = x coord of the top left corner + half its width
        const centerY = y + size / 2 // The same applies here but vertically.

        // Finds which "range" (aka cell) the player is standing on in each axis based on the argument passed.
        const findRange = function(center) {
            for (let i = 0; i < 3; i++) {
                if (center > (i * cellSize) && center <= ((i + 1) * cellSize)) {
                    return i
                }
            }
        }

        const indexX = findRange(centerY)
        const indexY = findRange(centerX)
        
        return { indexX, indexY }
    }

    const resetPos = () => [x, y] = [255,255]

    return { getColor, getSizes, crashWith, checkCell, move, resetPos }

})(30, "red", 255, 255, 200)

function Obstacle(min, max, minSpeed, maxSpeed, color, direction="") {
    const canvas = Renderer.data().canvas
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
        let secondsPassed = GameManager.getSeconds() || 1
        x += (speedX * secondsPassed)
        y += (speedY * secondsPassed)
    }
    // Borrows those methods from the component factory.
    
    return { getColor, getSizes, move, getSpeed }
}

function Marker(type, indexX, indexY) {
    const { canvas, cellSize, ctx } = Renderer.data()
    const offset = 35 //  To prevent them from being too big.

    // Draws an X on the provided cell.
    const drawX = function() {
        const x = indexY * cellSize
        const y = indexX * cellSize
        
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x + offset, y + offset)
        ctx.lineTo(x + cellSize - offset, y + cellSize - offset)
        ctx.moveTo(x + cellSize - offset, y + offset)
        ctx.lineTo(x + offset, y + cellSize - offset)
        ctx.stroke()
    }

    const drawO = function() {
        const x = cellSize * indexY + cellSize * 0.5
        const y = cellSize * indexX + cellSize * 0.5

        ctx.lineWidth = 3
        ctx.strokeStyle = "#ddd"

        ctx.beginPath()
        ctx.arc(x, y, cellSize * 0.5 - offset, 0, 2 * Math.PI)
        ctx.stroke()
    }

    // Returns a drawing function based on the provided arguments.
    return { draw: (type === "X" ? drawX : (type === "O" ? drawO : () => {})) }
}

const TurnManager = (function() {
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
    let turns = 1
    let currentPlayer = player
    let timeout

    const pickPlayer = function() {
        currentPlayer = Players[turns % 2]
        turns++
    }

    // Triggered when anybody places a marker.
    PubSub.subscribe("marker:placed", () => {
        let result = checkWin(GameManager.getMarkerMapping()) // Checks if somebody won.
        if (result) {
            win(result)
            return
        }

        pickPlayer() // Picks the next player.

        PubSub.publish("text:changed", (
            `${currentPlayer.name}'S TURN`
        ))

        // If the (human) player is picked, the next turn is theirs after 3s. Increases the difficulty :p
        if (currentPlayer === player) {
            GameManager.togglePlaceMarker(true)
        }
        else {
            GameManager.togglePlaceMarker(false) // Prevents the (human) player from playing.
            timeout = setTimeout(() => PubSub.publish("turn:computer"), 1500) // Computer's turn after 1.5s. Raises difficulty as well.
        }
    })

    // Computer's actions.
    PubSub.subscribe("turn:computer", () => {
        const markerMapping = GameManager.getMarkerMapping()
        AI.makeMove(markerMapping)
    })    

    // Checks if the player can even place a marker on the cell they're on before publishing the event of placing.
    PubSub.subscribe("marker:willplace", () => {
        const { indexX, indexY } = PlayerObj.checkCell()
        if (GameManager.changeMarkerMapping(indexX, indexY)) PubSub.publish("marker:placed")
        
    })

    // Checks if somebody's won based on the hardcoded patterns.
    const checkWin = function(board) {
        for (let marker of ["X", "O"]) {
            if (patterns.some(pattern => { 
                return pattern.every(([i, j]) => board[i][j] === marker)
            })) return marker
        }
        
        if (board.every(row => row.every(cell => cell !== ""))) return "tie"

        return null // No winner yet.
    }

    const win = function(marker) {
        let text
        if (marker === "tie") {
            text = "IT'S A TIE!"
        }

        else {
            text = `${currentPlayer.name} WINS!`
        }

        PubSub.publish("text:changed", (text))
        Renderer.render()
        PubSub.publish("game:ended")
    }

    PubSub.subscribe("game:ended", () => {
        clearTimeout(timeout)
        turns = 1
        currentPlayer = player
    })

    const getCurrentPlayer = () => (currentPlayer)

    return { getCurrentPlayer, checkWin }
})()

// Your opponent. Can be very smart, can be very dumb.
const AI = (function() {
    let scores

    const difficulty = {
        "normal": 0.35,
        "hard": 0.2,
        "impossible": 0,
    }

    const makeMove = function(board) {
        const dif = difficulty[UIManager.getInput().aiDiff]
        if (Math.random() < dif) makeRandomMove(board)
        else makeBestMove(board)
    }

    const makeBestMove = function(board) {
        let bestScore = -Infinity
        let move = null
    
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === '') {
                    board[i][j] = computer.getMarker()
                    let score = minimax(board, 0, false) 
                    board[i][j] = ''
                    if (score > bestScore) {
                        bestScore = score
                        move = { i, j }
                    }
                }
            }
        }
        board[move.i][move.j] = computer.getMarker()
        PubSub.publish("marker:placed") 
    }    

    const minimax = function(board, depth, isMaximizing) {
        let result = TurnManager.checkWin(board)
        if (result !== null) { // "X", "O", "tie"
            return scores[result]
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (board[i][j] === '') {
                        board[i][j] = computer.getMarker()
                        let score = minimax(board, depth + 1, false)
                        board[i][j] = ''
                        bestScore = Math.max(score, bestScore)
                    }
                }
            }
            return bestScore

        } else {
            let bestScore = Infinity
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (board[i][j] === '') {
                        board[i][j] = player.getMarker();
                        let score = minimax(board, depth + 1, true)
                        board[i][j] = ''
                        bestScore = Math.min(score, bestScore)
                    }
                }
            }
            return bestScore
        }
    }

    const makeRandomMove = function(markerMapping) {
        const emptyCells = []
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (!markerMapping[i][j]) {
                    emptyCells.push([i, j])
                }
            }
        }
        if (emptyCells.length > 0) {
            const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
            GameManager.changeMarkerMapping(x, y)
            PubSub.publish("marker:placed")
            return true
        }
        return false
    }

    const setScores = function() {
        scores = {
            "X": player.getMarker() === "X" ? -1 : 1,
            "O": player.getMarker() === "O" ? -1 : 1,
            'tie': 0
        }
    }
    

    return { makeMove, setScores }

})()


GameManager.bindEvents()
Renderer.render()