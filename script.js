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
        document.body.insertBefore(canvas, document.body.childNodes[0])
        drawGrid()
    }

    const clear = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawGrid()
    }

    const drawGrid = function() {
        const width = canvas.width
        const height = canvas.height
    
        ctx.strokeStyle = "#ddd" 
        ctx.lineWidth = 1
        ctx.globalCompositeOperation = "destination-atop"
    
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

    return { start, clear, data }

})()

// Handles the bullet hell logic.
const GameBoard = (function() {
    const speed = 1 // playerPiece
    const minSpeed = 0.5 // Obstacles
    const maxSpeed = 1.25 // Obstacles
    const fps = 240
    const directions = ["right", "left", "top", "bottom"]
    const gameData = GameArea.data()
    const cellSize = gameData.cellSize
    const ctx = gameData.ctx
    const indexMapping = {
        0: [0, cellSize],
        1: [cellSize, 2 * cellSize],
        2: [2 * cellSize, 3 * cellSize]
    }
    const markerMapping = {}
    let myObstacles = []
    const playerPiece = Component(30, 30, "red", 0.5 * (gameData.canvas.width - 30), 0.5 * (gameData.canvas.width - 30))
    let keys
    let frameNo = 0
    let interval
    

    // Component factory
    function Component(width, height, color, x, y, speedX = 0, speedY = 0) {
        const update = function() {
            ctx.fillStyle = color
            ctx.fillRect(x, y, width, height)
        }

        const newPos = function() {
            x += speedX
            y += speedY
        }

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

        const limit = function() {
            if (x < 0) x = 0 
            if (x + width > gameData.canvas.width) x = gameData.canvas.width - width 
            if (y < 0) y = 0 
            if (y + height > gameData.canvas.height) y = gameData.canvas.height - height 
        }

        const getSizes = () => ({ x, y, width, height })

        const setSpeed = function(speedx, speedy) {
            speedX = speedx === false ? speedX : speedx
            speedY = speedy === false ? speedY : speedy
        }

        const checkCell = function() {
            const centerX = x + width / 2
            const centerY = y + height / 2

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
        const size = Math.random() * (max - min) + min
        let x = 0 
        let y = 0
        let speedX = 0
        let speedY = 0
        const width = size
        const height = size
        direction = direction || directions[Math.floor(Math.random() * directions.length)]
        
        const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed

        const rand = function(r1, r2) {
            return Math.random() * (r2 - r1) + r1
        }

        const generateSpawnLocation = function() {
            const canvas = gameData.canvas
            switch(direction) {
                case "right": 
                    y = rand(0, canvas.height - height)
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

        const { update, newPos, getSizes } = Component(width, height, color, x, y, speedX, speedY)

        return { update, newPos, getSizes, rand, generateSpawnLocation }
    }

    // Marker factory
    function Marker(type, indexX, indexY) {

        const drawX = function() {
            const offset = 35
            const x = indexX * cellSize
            const y = indexY * cellSize
            
            ctx.lineWidth = 3
            ctx.globalCompositeOperation='destination-over';
            ctx.beginPath()
            ctx.moveTo(x + offset, y + offset)
            ctx.lineTo(x + cellSize - offset, y + cellSize - offset)
            ctx.moveTo(x + cellSize - offset, y + offset)
            ctx.lineTo(x + offset, y + cellSize - offset)
            ctx.stroke()
        }

        const drawO = function() {
            // DRAW O
        }

        return { draw: type === "X" ? drawX : drawO }
    }

    // Detects crashes/collisions and removes the obstacles that are out of the canvas.
    const checkCrashAndClean = function() {
        myObstacles = myObstacles.filter(obstacle => {
            // if (playerPiece.crashWith(obstacle)) {
            //     console.log("CRASHHHHH")
            //     stopGame()
            //     return false
            // }
        
            const { x, y, width, height } = obstacle.getSizes()
            return x + width >= 0 && x <= gameData.canvas.width && y + height >= 0 && y <= gameData.canvas.height
        })
    }

    const updateMarkers = function() {
        const { cellX, cellY } = playerPiece.checkCell()
        if (markerMapping[[cellX, cellY]]) return
        markerMapping[[cellX, cellY]] = player.marker
    }

    const renderMarkers = function() {
        const arr = Object.entries(markerMapping) // [['1,1' , 'X' ]]
        arr.forEach(cell => {
            const marker = Marker(cell[1], cell[0][0], cell[0][2])
            marker.draw()
        })
    }

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
        GameArea.clear()
        frameNo++

        // Obstacles //
        if (everyInterval(fps / 4) || frameNo === 1) {
            const obstacle = Obstacle(20, 40, "green")
            myObstacles.push(obstacle)
        }
        myObstacles.forEach(obstacle => {
            obstacle.newPos()
            obstacle.update()
        })
    
        // playerPiece //
        playerPiece.speedX = 0
        playerPiece.speedY = 0
        playerPiece.setSpeed(0,0)
        if (keys && keys["ArrowLeft"]) { playerPiece.setSpeed(-speed, false) }
        if (keys && keys["ArrowRight"]) { playerPiece.setSpeed(speed, false) }
        if (keys && keys["ArrowUp"]) { playerPiece.setSpeed(false, -speed) }
        if (keys && keys["ArrowDown"]) { playerPiece.setSpeed(false, speed) }
        playerPiece.newPos()
        playerPiece.limit()
        playerPiece.update()

        // Markers 
        if (player.turn()) updateMarkers()
        renderMarkers()
    }    

    const startGame = function() {
        GameArea.start()
        interval = setInterval(updateGameArea, 1000 / fps)
        bindEvents()
        console.log("Game started.")
    }

    const stopGame = function() {
        clearInterval(interval)
    }

    return { startGame }
    
})()

GameBoard.startGame()
