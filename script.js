const speed = 5 // Player
const minSpeed = 2 // Obstacles
const maxSpeed = 5 // Obstacles
const fps = 60
const directions = ["right", "left", "top", "bottom"]
const myObstacles = []
const canvasEl = document.querySelector("canvas")

function drawGrid() {
    let ctx = myGameArea.context
    let width = myGameArea.canvas.width
    let height = myGameArea.canvas.height

    gridSize = myGameArea.canvas.width / 3

    ctx.strokeStyle = "#ddd" 
    ctx.lineWidth = 1

    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
    }
    
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
    }
}

let myGameArea = {
    canvas: canvasEl,
    start: function () {
        this.canvas.width = 540
        this.canvas.height = 540
        this.context = this.canvas.getContext("2d")
        document.body.insertBefore(this.canvas, document.body.childNodes[0])
        drawGrid()
        this.interval = setInterval(updateGameArea, 1000 / fps)
        this.frameNo = 0
        window.addEventListener('keydown', function (e) {
            myGameArea.keys = (myGameArea.keys || [])
            myGameArea.keys[e.key] = true
        })
        window.addEventListener('keyup', function (e) {
            myGameArea.keys[e.key] = false
        })
    },
    clear: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
        drawGrid()
    },
    stop: function () {
        clearInterval(this.interval)
    }
}

function Component(width, height, color, x, y) {
    this.width = width
    this.height = height
    this.color = color
    this.x = x
    this.y = y
    this.speedX = 0
    this.speedY = 0   
}

Component.prototype.update = function () {
    ctx = myGameArea.context
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y, this.width, this.height)
}

Component.prototype.newPos = function () {
    this.x += this.speedX
    this.y += this.speedY
}

Component.prototype.crashWith = function (otherobj) {
    let myleft = this.x
    let myright = this.x + (this.width)
    let mytop = this.y
    let mybottom = this.y + (this.height)

    let otherleft = otherobj.x
    let otherright = otherobj.x + (otherobj.width)
    let othertop = otherobj.y
    let otherbottom = otherobj.y + (otherobj.height)

    let crash = true

    if ((mybottom < othertop) ||
        (mytop > otherbottom) ||
        (myright < otherleft) ||
        (myleft > otherright)) {
        crash = false
    }
    return crash
}

Component.prototype.limit = function () {
    if (this.x < 0) this.x = 0 
    if (this.x + this.width > myGameArea.canvas.width) this.x = myGameArea.canvas.width - this.width 
    if (this.y < 0) this.y = 0 
    if (this.y + this.height > myGameArea.canvas.height) this.y = myGameArea.canvas.height - this.height 
}

function Obstacle(min, max, color, direction="") {
    this.size = Math.random() * (max - min) + min
    this.width = this.size
    this.height = this.size
    this.color = color
    this.direction = direction || directions[Math.floor(Math.random() * directions.length)]
    this.x = 0
    this.y = 0
    this.r1 = 0
    this.r2 = 0
    this.speedX = 0
    this.speedY = 0
    this.speed = Math.random() * (maxSpeed - minSpeed) + minSpeed
    // spawn: Math.rand() * (r2 - r1) + r1
    // example: right -> rand * (0 - (canvas height - this.height)), position.x ++
}

Obstacle.prototype.rand = function(r1, r2) {
    return Math.random() * (r2 - r1) + r1
}

Obstacle.prototype.spawn = function() {
    const canvas = myGameArea.canvas
    switch(this.direction) {
        case "right": 
            this.y = this.rand(0, canvas.height - this.height)
            this.x = 0
            this.speedX = this.speed
            break
        case "left": 
            this.y = this.rand(0, canvas.height - this.height)
            this.x = canvas.width - this.width
            this.speedX = -this.speed
            break
        case "bottom": 
            this.y = 0
            this.x = this.rand(0, canvas.width - this.width)
            this.speedY = this.speed
            break
        case "top": 
            this.y = canvas.height - this.height
            this.x = this.rand(0, canvas.width - this.width)
            this.speedY = -this.speed
            break
    }
}

Object.setPrototypeOf(Obstacle.prototype, Component.prototype)

function everyInterval(n) {
    if ((myGameArea.frameNo / n) % 1 === 0) { return true }
    return false
}

function updateGameArea() {
    // Collision //
    myObstacles.forEach(obstacle => {
        if (myGamePiece.crashWith(obstacle)) {
            // Remember to add collision logic here (game over or whatever)
            myGameArea.stop()
            return
        }
    })
    
    // General //
    myGameArea.clear()
    myGameArea.frameNo += 1

    // Obstacles //
    if (everyInterval(fps / 4) || myGameArea.frameNo === 1) {
        const obstacle = new Obstacle(20, 40, "green")
        obstacle.spawn()
        myObstacles.push(obstacle)
    }
    myObstacles.forEach(obstacle => {
        obstacle.newPos()
        obstacle.update()
    })

    // Player //
    myGamePiece.speedX = 0
    myGamePiece.speedY = 0
    if (myGameArea.keys && myGameArea.keys["ArrowLeft"]) { myGamePiece.speedX = -speed }
    if (myGameArea.keys && myGameArea.keys["ArrowRight"]) { myGamePiece.speedX = speed }
    if (myGameArea.keys && myGameArea.keys["ArrowUp"]) { myGamePiece.speedY = -speed }
    if (myGameArea.keys && myGameArea.keys["ArrowDown"]) { myGamePiece.speedY = speed }
    myGamePiece.newPos()
    myGamePiece.limit()
    myGamePiece.update()
}

function startGame() {
    myGameArea.start()
    myGamePiece = new Component(30, 30, "red", 0.5 * (canvasEl.width - 30), 0.5 * (canvasEl.width - 30))
}

startGame()
