const GameArea = (function() {
    const canvas = document.querySelector("canvas")
    canvas.width = 540
    canvas.height = 540
    const cellSize = canvas.width / 3
    const ctx = canvas.getContext("2d")
    let frameNo = 0

    const start = function () {
        document.body.insertBefore(canvas, document.body.childNodes[0])
        drawGrid()
        bindEvents()
    }

    const bindEvents = function() {
        window.addEventListener('keydown', function (e) {
            GameArea.keys = (GameArea.keys || [])
            GameArea.keys[e.key] = true
        })
        window.addEventListener('keyup', function (e) {
            GameArea.keys[e.key] = false
        })
    }
    
    const clear = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawGrid()
    }

    const stop = function () {
        clearInterval(interval)
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

        drawCells()
    }

    const drawCells = function() {
        let x = 0
        let y = 0

        for(let i = 0; i < 3; i++) {
            x = GameArea.cellSize * i
            for(let j = 0; j < 3; j++)
                y = GameArea.cellSize * j
                drawCell(x, y)
        }
    }
    
    const drawCell = function(x, y) {
        // TODO
    }

    const data = () => ({ canvas, cellSize, ctx, frameNo })

    return { start, clear, stop, data }

})()


const GameBoard = (function() {
    const speed = 5 // playerPiece
    const minSpeed = 2 // Obstacles
    const maxSpeed = 5 // Obstacles
    const fps = 60
    const directions = ["right", "left", "top", "bottom"]
    const gameData = GameArea.data()
    const myObstacles = []
    const playerPiece = Component(30, 30, "red", 0.5 * (gameData.canvas.width - 30), 0.5 * (gameData.canvas.width - 30))

    // Component factory
    function Component(width, height, color, x, y) {
        let speedX = 0
        let speedY = 0  
        
        const update = function() {
            ctx = gameData.ctx
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
            
        return { update, newPos, crashWith, limit, getSizes, speedX, speedY }
    }
    
    // Obstacle factory
    function Obstacle(min, max, color, direction="") {
        const size = Math.random() * (max - min) + min
        let x = 0
        let y = 0
        const width = size
        const height = size
        direction = direction || directions[Math.floor(Math.random() * directions.length)]
        let speedX = 0
        let speedY = 0
        const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed

        const { update, newPos, getSizes } = Component(width, height, color, x, y)

        const rand = function(r1, r2) {
            return Math.random() * (r2 - r1) + r1
        }

        const spawn = function() {
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
        
        return { update, newPos, getSizes, rand, spawn }
    }
    
    // Returns true every n frames.
    function everyInterval(n) {
        if ((gameData.frameNo / n) % 1 === 0) { return true }
        return false
    }
    
    // Updates the game every frame.
    const updateGameArea = function() {
        // Collision //
        myObstacles.forEach(obstacle => {
            if (playerPiece.crashWith(obstacle)) {
                // Remember to add collision logic here (game over or whatever)
                GameArea.stop()
                return
            }
        })
        
        // General //
        GameArea.clear()
        GameArea.frameNo += 1
    
        // Obstacles //
        if (everyInterval(fps / 4) || GameArea.frameNo === 1) {
            const obstacle = Obstacle(20, 40, "green")
            obstacle.spawn()
            myObstacles.push(obstacle)
        }
        myObstacles.forEach(obstacle => {
            obstacle.newPos()
            obstacle.update()
        })
    
        // playerPiece //
        playerPiece.speedX = 0
        playerPiece.speedY = 0
        if (GameArea.keys && GameArea.keys["ArrowLeft"]) { playerPiece.speedX = -speed }
        if (GameArea.keys && GameArea.keys["ArrowRight"]) { playerPiece.speedX = speed }
        if (GameArea.keys && GameArea.keys["ArrowUp"]) { playerPiece.speedY = -speed }
        if (GameArea.keys && GameArea.keys["ArrowDown"]) { playerPiece.speedY = speed }
        playerPiece.newPos()
        playerPiece.limit()
        playerPiece.update()
        console.log("Update successful.")
    }
    
    const startGame = function() {
        GameArea.start()
        const interval = setInterval(GameBoard.updateGameArea, 1000 / fps)
        console.log("Game started.")
    }

    return { startGame, updateGameArea }
    
})()

GameBoard.startGame()
