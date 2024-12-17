const grid = document.getElementById("grid")
const hiddenObj = document.querySelector("#hide")
const player = document.querySelector("#player")

function getGridSizes(gridElement) {
    const styles = window.getComputedStyle(gridElement)
    const gridRect = gridElement.getBoundingClientRect()

    const size = gridRect.width 
    const left = gridRect.left
    const right = gridRect.right
    const top = gridRect.top
    const bottom = gridRect.bottom
    const cellSizes = styles.gridTemplateColumns.split(" ")

    return {
        size, 
        left, 
        right, 
        top, 
        bottom,
        cellSizes
    }
}

function getObjSize() {
    const objRect = hiddenObj.getBoundingClientRect()
    return objRect.width
}

function getPlayerSize() {
    // might need  
}
console.log(getObjSize())


function getRandomGridLinePoint() {
    const gridData = getGridSizes(grid)
    const rows = 3
    const cols = 3

    const size = gridData.size
    const left = gridData.left
    const right = gridData.right
    const top = gridData.top
    const bottom = gridData.bottom
    const cellSizes = gridData.cellSizes
    
    let x = Math.random() * ((right - getObjSize()) - left) + left
    let y = top

    console.log("x, y: ", x, y)

    return {x, y, bottom}
}

// Spawn an object
function spawnFallingObject() {
    const {x, y, bottom} = getRandomGridLinePoint()

    const object = document.createElement("div")
    object.classList.add("falling-object")
    object.style.left = `${x}px`
    object.style.top = `${y}px`

    document.body.appendChild(object)

    let positionY = y
    const fallInterval = setInterval(() => {
        positionY += 0.5
        object.style.top = `${positionY}px`
        player.style.left = `${positionY}px`

        if (positionY >= bottom - getObjSize()) {
            clearInterval(fallInterval)
            object.remove()
        }
    }, 1)
}

document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        spawnFallingObject()
        return
    }

    const elementRect = player.getBoundingClientRect()
    const containerRect = grid.getBoundingClientRect()

    const top = elementRect.top - containerRect.top
    const left = elementRect.left - containerRect.left

    if (e.key === 'a' || e.key === "ArrowLeft") {
        console.log(left)
        player.style.left = `${left - 5}px`
    }

    if (e.key === 'd' || e.key === "ArrowRight") {
        player.style.left = `${left + 5}px`
    }

    if (e.key === 'w' || e.key === "ArrowUp") {
        player.style.top = `${top - 5}px`
    }

    if (e.key === 's' || e.key === "ArrowDown") {
        player.style.top = `${top + 5}px`
    }
})


// setInterval(spawnFallingObject, 1000)
