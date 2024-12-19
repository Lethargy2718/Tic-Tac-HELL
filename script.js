const Player = function(name, marker) {

    function turn() {
        return true
    }

    return { name, marker, turn }
}

const player = Player("Lethargy", "X")

// Handles the rendering of the canvas.
const GameArea = (function() {
    const canvas = document.querySelector("canvas")
    canvas.width = 540
    canvas.height = 540
    const cellSize = canvas.width / 3
    const ctx = canvas.getContext("2d")
    
    const start = function () {
        drawGrid()
    }

    const clear = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height) // Clears the canvas
    }

    const drawGrid = function() {
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

    const data = () => ({ canvas, cellSize, ctx })

    return { start, clear, data, drawGrid }

})()

// Handles the bullet hell logic.
const GameBoard = (function() {
    const speed = 1 // playerPiece
    const minSpeed = 0.5 // Obstacles
    const maxSpeed = 1.25 // Obstacles
    const fps = 240
    const directions = ["right", "left", "top", "bottom"] // Obstacle possible directions
    const gameData = GameArea.data() // canvas, cellSize, ctx
    const cellSize = gameData.cellSize
    const ctx = gameData.ctx
    const indexMapping = { // Maps each grid cell index to its range (start point -> end point).
        0: [0, cellSize],
        1: [cellSize, 2 * cellSize],
        2: [2 * cellSize, 3 * cellSize]
    }
    const markerMapping = {} // Maps each grid cell index to the marker currently on it (X or O).
    let currentObstacles = [] // Obstacles currently on the screen.
    const playerPiece = Component(30, 30, "red", 0.5 * (gameData.canvas.width - 30), 0.5 * (gameData.canvas.width - 30)) // Player character
    let keys // Input keys mapping in order to bind events to their respective keys.
    let frameNo = 0 // Current frame.
    let interval // The main game interval where setInterval()'s returned value is stored.
    

    // Component factory
    function Component(width, height, color, x, y, speedX = 0, speedY = 0) {
        // Rerenders after clearing the canvas.
        const update = function() {
            ctx.fillStyle = color
            ctx.fillRect(x, y, width, height)
        }

        // Calculates the new position.
        const newPos = function() {
            x += speedX
            y += speedY
        }

        // Detects collisions with obstacles.
        const crashWith = function(otherObj) {
            const myleft = x
            const myright = x + (width)
            const mytop = y
            const mybottom = y + (height)
            
            const otherObjSizes = otherObj.getSizes()
            const otherleft = otherObjSizes.x
            const otherright = otherObjSizes.x + (otherObjSizes.width)
            const othertop = otherObjSizes.y
            const otherbottom = otherObjSizes.y + (otherObjSizes.height)
    
            let crash = true
    
            if ((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright)) crash = false
           
            return crash
        }

        // Prevents the player from leaving the canvas' boundaries.
        const limit = function() {
            if (x < 0) x = 0 
            if (x + width > gameData.canvas.width) x = gameData.canvas.width - width 
            if (y < 0) y = 0 
            if (y + height > gameData.canvas.height) y = gameData.canvas.height - height 
        }

        // Returns those variables.
        const getSizes = () => ({ x, y, width, height })

        // Sets the speed of the character based on the pressed keys.
        const setSpeed = function(speedx, speedy) {
            speedX = speedx === false ? speedX : speedx
            speedY = speedy === false ? speedY : speedy
        }

        // Detects the cell the player is currently "standing" on.
        const checkCell = function() {
            const centerX = x + width / 2 // The X coord for the center of the player = x coord of the top left corner + half its width
            const centerY = y + height / 2 // The same applies here but vertically.

            // Finds which "range" (aka cell) the player is standing on in each direction based on the argument passed.
            const findRange = function(center) {
                for (let key in indexMapping) {
                    if (center >= indexMapping[key][0] && center < indexMapping[key][1]) return key
                }
            }
            
            return { cellX: findRange(centerX), cellY: findRange(centerY) }
        }

        return { update, newPos, crashWith, limit, getSizes, checkCell, setSpeed }
    }
    
    // Obstacle factory
    function Obstacle(min, max, color, direction="") {
        const size = Math.random() * (max - min) + min // Picks a random size for the obstacle based on the specified range.
        let x = 0 
        let y = 0
        let speedX = 0
        let speedY = 0
        const width = size
        const height = size
        direction = direction || directions[Math.floor(Math.random() * directions.length)] // Picks a random direction for the obstacle if not specified.
        
        const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed // Picks a random speed based on the specified range.

        // Picks a random value between two specified values.
        const rand = function(r1, r2) {
            return Math.random() * (r2 - r1) + r1
        }

        // Picks a random spawn coordinate and speed based on the direction specified.
        const generateSpawnLocation = function() {
            const canvas = gameData.canvas
            switch(direction) {
                case "right": 
                    y = rand(0, canvas.height - height) // There is always some offset to prevent the obstacles from partially (or even fully) spawning outside of the canvas.
                    x = 0
                    speedX = speed
                    break
                case "left": 
                    y = rand(0, canvas.height - height)
                    x = canvas.width - width
                    speedX = -speed
                    break
                case "bottom": 
                    y = 0
                    x = rand(0, canvas.width - width)
                    speedY = speed
                    break
                case "top": 
                    y = canvas.height - height
                    x = rand(0, canvas.width - width)
                    speedY = -speed
                    break
            }
        }

        generateSpawnLocation()

        // Borrows those methods from the component factory.
        const { update, newPos, getSizes } = Component(width, height, color, x, y, speedX, speedY) 

        return { update, newPos, getSizes, rand, generateSpawnLocation }
    }

    // Marker factory
    function Marker(type, indexX, indexY) {


        // Draws an X on the provided cell.
        const drawX = function() {
            const offset = 35 //  To prevent it from being too big and touching the corners of the cell.
            const x = indexX * cellSize
            const y = indexY * cellSize
            
            ctx.lineWidth = 3
            ctx.globalCompositeOperation = 'destination-over' // Places the marker below everything else on the canvas.
            ctx.beginPath()
            ctx.moveTo(x + offset, y + offset)
            ctx.lineTo(x + cellSize - offset, y + cellSize - offset)
            ctx.moveTo(x + cellSize - offset, y + offset)
            ctx.lineTo(x + offset, y + cellSize - offset)
            ctx.stroke()
        }

        const drawO = function() {
            // TODO
        }

        // Returns a drawing function based on the provided arguments.
        return { draw: type === "X" ? drawX : drawO }
    }

    // Detects crashes/collisions and removes the obstacles that are out of the canvas.
    const checkCrashAndClean = function() {
        currentObstacles = currentObstacles.filter(obstacle => {
            if (playerPiece.crashWith(obstacle)) { // If a crash happened, stop the game. TODO Will add a gameover here later.
                stopGame()
                return false
            }
        
            const { x, y, width, height } = obstacle.getSizes()
             // Keeps the obstacle in the array only if it's still inside the canvas, effectively deleting the ones outside.
            return x + width >= 0 && x <= gameData.canvas.width && y + height >= 0 && y <= gameData.canvas.height
        })
    }

    // Adds a new marker if possible.
    const updateMarkers = function() {
        const { cellX, cellY } = playerPiece.checkCell()
        if (markerMapping[[cellX, cellY]]) return
        markerMapping[[cellX, cellY]] = player.marker
    }

    // Renders the markers on the canvas.
    const renderMarkers = function() {
        const arr = Object.entries(markerMapping) // [['1,1' , 'X' ]]
        arr.forEach(cell => {
            const marker = Marker(cell[1], cell[0][0], cell[0][2])
            marker.draw()
        })
    }

    // Binds events to inputs.
    const bindEvents = function() {
        window.addEventListener('keydown', function (e) {
            keys = (keys || [])
            keys[e.key] = true
        })
        window.addEventListener('keyup', function (e) {
            keys[e.key] = false
        })
    }

    // Returns true every n frames.
    const everyInterval = function(n) {
        if ((frameNo / n) % 1 === 0) { return true }
        return false
    }
    
    // Updates the game every frame.
    const updateGameArea = function() {
        checkCrashAndClean()       
        
        // General //
        GameArea.clear() // Clears the canvas
        frameNo++ // Increases frames by 1

        // Obstacles //
        if (everyInterval(fps / 4) || frameNo === 1) { // Creates a new obstacle every fps / 4 frames and on the first frame.
            const obstacle = Obstacle(20, 40, "green")
            currentObstacles.push(obstacle)
        }
        currentObstacles.forEach(obstacle => { // Updates each obstacle every frame.
            obstacle.newPos()
            obstacle.update()
        })
    
        // playerPiece //
        playerPiece.speedX = 0
        playerPiece.speedY = 0
        playerPiece.setSpeed(0,0)
        if (keys && keys["ArrowLeft"]) { playerPiece.setSpeed(-speed, false) } // All this is to handle fluid movement in all 8 directions and update the player's location.
        if (keys && keys["ArrowRight"]) { playerPiece.setSpeed(speed, false) }
        if (keys && keys["ArrowUp"]) { playerPiece.setSpeed(false, -speed) }
        if (keys && keys["ArrowDown"]) { playerPiece.setSpeed(false, speed) }
        playerPiece.newPos()
        playerPiece.limit()
        playerPiece.update()

        // Markers 
        if (player.turn()) updateMarkers() // Allows the player to add a marker if it's their turn.
        renderMarkers()

        GameArea.drawGrid() // Renders the grid on the canvas.
    }    

    const startGame = function() {
        GameArea.start()
        interval = setInterval(updateGameArea, 1000 / fps) // Updates the game so that it runs at fps (the variable) frames per second.
        bindEvents() // Binds the input keys to their events.
    }

    const stopGame = function() {
        clearInterval(interval)
    }

    return { startGame }
    
})()

GameBoard.startGame()
