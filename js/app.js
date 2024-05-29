class Grid {
    constructor(canvas, ctx, totalGridSquares, scale) {
        // This will store each room that is added.
        this.rooms = [];

        this.canvas = canvas;
        this.ctx = ctx;
        this.totalGridSquares = totalGridSquares;
        this.scale = scale;

        // Start at the middle of the grid
        this.offsetX = -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.width / (2 * 20 * scale));
        this.offsetY = -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.height / (2 * 20 * scale));

        this.isPanning = false;
        this.startPanX = null;
        this.startPanY = null;

        this.mouseX = 0;
        this.mouseY = 0;

        this.isDrawing = false;
        this.selectedTool = null;

        this.startingRoomId = 1; // Default value
        this.currentRoomId = this.startingRoomId;
    }

    initializeGrid() {
        this.zoneId = document.getElementById('zoneId').value;
        this.scale = 1;
        this.offsetX = -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.width / (2 * 20 * this.scale));
        this.offsetY = -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.height / (2 * 20 * this.scale));
        this.drawGrid();
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the rooms.
        for (let room of this.rooms) {
            this.ctx.fillStyle = 'rgb(180,180,180)';  // Light grey fill color
            this.ctx.strokeStyle = 'black';  // Black stroke color
            this.ctx.lineWidth = 3;  // Increase border thickness

            let roomX = room.gridX * 20 * this.scale + this.offsetX;
            let roomY = room.gridY * 20 * this.scale + this.offsetY;
            let roomSize = room.gridSize * 20 * this.scale;

            this.ctx.fillRect(roomX, roomY, roomSize, roomSize);  // Fill room
            this.ctx.strokeRect(roomX, roomY, roomSize, roomSize);  // Draw border around room

            // Add room ID to room. Adjust coordinates as needed for the position.
            this.ctx.fillStyle = 'black';  // Set text color to black
            this.ctx.font = (0.8 * this.scale) + "px Arial";  // Set font size. Adjust as needed.

            // Convert roomId to string for each room in the loop and pad it with 0s
            const roomIdStr = String(room.roomId).padStart(3, '0');
            this.ctx.fillText(`${grid.zoneId}:${roomIdStr}`, roomX, roomY + this.ctx.measureText('M').width);
        }

        // Reset the lineWidth after drawing the rooms to avoid unwanted thick lines elsewhere
        this.ctx.lineWidth = 1;

        let highlightX = Math.floor((this.mouseX - this.offsetX) / (20 * this.scale));
        let highlightY = Math.floor((this.mouseY - this.offsetY) / (20 * this.scale));

        // Change the grid lines color to a color lighter than #333.
        this.ctx.strokeStyle = '#444';

        // Use a black color for the text in the 500,500 square
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(`${500}, ${500}`, (20 * 500 + 15) * this.scale + this.offsetX, (20 * 500 + 18) * this.scale + this.offsetY);

        this.ctx.fillStyle = '#fff'; // Set text color
        this.ctx.font = (1 * this.scale) + "px Arial";

        // Calculate range of cells in view horizontally
        let minGridX = Math.max(Math.floor((-this.offsetX) / (20 * this.scale)), 0);
        let maxGridX = Math.min(Math.ceil((this.canvas.width - this.offsetX) / (20 * this.scale)), this.totalGridSquares);

        // Calculate range of cells in view vertically
        let minGridY = Math.max(Math.floor((-this.offsetY) / (20 * this.scale)), 0);
        let maxGridY = Math.min(Math.ceil((this.canvas.height - this.offsetY) / (20 * this.scale)), this.totalGridSquares);

        // Only operate within those cells
        for (let i = minGridX; i < maxGridX; i++) {
            for (let j = minGridY; j < maxGridY; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.offsetX, this.scale * 20 * j + this.offsetY);
                this.ctx.lineTo(this.scale * 20 * this.totalGridSquares + this.offsetX, this.scale * 20 * j + this.offsetY);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(this.scale * 20 * i + this.offsetX, this.offsetY);
                this.ctx.lineTo(this.scale * 20 * i + this.offsetX, this.scale * 20 * this.totalGridSquares + this.offsetY);
                this.ctx.stroke();

                let roomAtCurrentLocation = this.rooms.find(room => room.gridX === i && room.gridY === j);

                // Only change the color at 500, 500 if there is not a room there
                if (i == 500 && j == 500 && !roomAtCurrentLocation) {
                    this.ctx.fillStyle = 'rgba(100, 100, 100, 1)';
                    this.ctx.fillRect(i * 20 * this.scale + this.offsetX, j * 20 * this.scale + this.offsetY, 20 * this.scale, 20 * this.scale);
                }

                // Only print labels when the scale is 5 or more
                if (this.scale >= 5) {
                    // Use a black color for the text in the 500,500 square
                    if (i == 500 && j == 500) {
                        this.ctx.fillStyle = 'black';
                    } else {
                        // Revert back to white for other squares
                        this.ctx.fillStyle = 'white';
                    }

                    // this.ctx.fillText(`${i}, ${j}`, (20 * i + 15) * this.scale + this.offsetX, (20 * j + 18) * this.scale + this.offsetY);

                }
            }
        }

        // Highlight the grid square under the mouse
        if (highlightX >= 0 && highlightX < this.totalGridSquares && highlightY >= 0 && highlightY < this.totalGridSquares) {
            if (this.selectedTool === 'room') {
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; // semi-transparent green
            } else if (this.selectedTool === 'eraser') {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // semi-transparent red
            } else {
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // semi-transparent yellow
            }
            this.ctx.fillRect(highlightX * 20 * this.scale + this.offsetX, highlightY * 20 * this.scale + this.offsetY, 20 * this.scale, 20 * this.scale);
        }
    }

    panStart(x, y) {
        this.isPanning = true;
        this.startPanX = x;
        this.startPanY = y;
    }

    panMove(x, y) {
        if (this.isPanning) {
            let dx = x - this.startPanX;
            let dy = y - this.startPanY;

            // If movement will still be within canvas boundaries
            if (this.offsetX + dx < this.canvas.width / 2 && this.offsetX + dx > -this.totalGridSquares * 20 * this.scale + this.canvas.width / 2) {
                this.offsetX += dx;
            }
            if (this.offsetY + dy < this.canvas.height / 2 && this.offsetY + dy > -this.totalGridSquares * 20 * this.scale + this.canvas.height / 2) {
                this.offsetY += dy;
            }

            this.startPanX = x;
            this.startPanY = y;
        }

        this.mouseX = x;
        this.mouseY = y;

        this.drawGrid();
    }

    panEnd() {
        this.isPanning = false;
    }

    zoom(deltaY) {
        let oldScale = this.scale;
        this.scale *= Math.pow(1.01, -deltaY / 100);

        let mouseGridX = (this.mouseX - this.offsetX) / oldScale;
        let mouseGridY = (this.mouseY - this.offsetY) / oldScale;

        this.offsetX = this.mouseX - mouseGridX * this.scale;
        this.offsetY = this.mouseY - mouseGridY * this.scale;

        this.drawGrid();
    }

    updateInfo(x, y) {
        let gridX = Math.floor((x - this.offsetX) / (20 * this.scale));
        let gridY = Math.floor((y - this.offsetY) / (20 * this.scale));
        document.getElementById('info').textContent = `x:${gridX} y:${gridY} s:${this.scale.toFixed(2)}`;
    }

    setupKeyListener() {
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    // this.scale = 1;
                    this.offsetX = -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.width / (2 * 20 * this.scale));
                    this.offsetY = -this.scale * 20 * (this.totalGridSquares / 2 - this.canvas.height / (2 * 20 * this.scale));
                    this.drawGrid();
                    break;
                case 'Escape':
                    // Set selected tool to null (no tool selected) when ESC key is pressed
                    this.selectTool(null);
                    break;
            }
        });
    }

    selectTool(tool) {
        this.selectedTool = tool;
    }

    // When adding a room
    addRoom(room) {
        let roomIds = this.rooms.map(room => room.roomId);
        let newRoomId = this.currentRoomId;

        for (let i = this.startingRoomId; i <= this.currentRoomId; i++) {
            if (!roomIds.includes(i)) {
                newRoomId = i;
                break;
            } else if (i === this.currentRoomId) {
                newRoomId = ++this.currentRoomId;
            }
        }

        room.roomId = newRoomId;
        this.rooms.push(room);

        this.drawGrid(); // Redraw grid after adding room
    }

    // When removing a room by index
    removeRoom(index) {
        this.rooms.splice(index, 1);
        this.drawGrid(); // Redraw grid after removing room
    }
}

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const totalGridSquares = 1000;
const scale = 0.5;

const grid = new Grid(canvas, ctx, totalGridSquares, scale);
grid.setupKeyListener();
grid.initializeGrid();

// Here is a good place to put the event listener
document.getElementById('roomShape').addEventListener('click', function () {
    grid.selectTool('room');
});

document.getElementById('pointerIcon').addEventListener('click', function () {
    grid.selectTool(null);  // No tool is selected, so it's in pan/scroll mode
});

document.getElementById('eraserIconContainer').addEventListener('click', function () {
    grid.selectTool('eraser');
});

let toolIsActive = false;

document.getElementById('toolPallet').addEventListener('mousedown', function (event) {
    toolIsActive = true; // the mousedown event happened on the tool palette
});

// mousedown event handler
window.addEventListener('mousedown', (e) => {
    if (toolIsActive) {
        toolIsActive = false; // Reset the flag
        return; // Don't continue with the other mousedown logic
    }

    if (grid.selectedTool === 'room') {
        grid.isDrawing = true;

        // Calculate the grid coordinates where the mouse was clicked.
        let gridX = Math.floor((e.clientX - grid.offsetX) / (20 * grid.scale));
        let gridY = Math.floor((e.clientY - grid.offsetY) / (20 * grid.scale));

        // Create a new room at the grid coordinates,
        // with a size of one grid square.
        let room = {
            gridX: gridX,
            gridY: gridY,
            gridSize: 1
        };
        grid.addRoom(room);
    } else if (grid.selectedTool === 'eraser') {
        // Calculate the coordinates of the grid square under the mouse
        let roomX = Math.floor((e.clientX - grid.offsetX) / (20 * grid.scale));
        let roomY = Math.floor((e.clientY - grid.offsetY) / (20 * grid.scale));

        // Find the room at this location, if any
        let roomIndex = grid.rooms.findIndex(room => room.gridX === roomX && room.gridY === roomY);

        // If a room is found, remove it from the grid's rooms array
        if (roomIndex > -1) {
            grid.removeRoom(roomIndex);
        }
    } else {
        grid.panStart(e.clientX, e.clientY);
    }
});

window.addEventListener('mouseup', () => {
    grid.isDrawing = false;
    grid.panEnd();
});

window.addEventListener('mousemove', (e) => {
    if (grid.isDrawing) {
        // Calculate the coordinates of the grid square under the mouse and draw room
        let roomX = Math.floor((e.clientX - grid.offsetX) / (20 * grid.scale));  // replaced this with grid
        let roomY = Math.floor((e.clientY - grid.offsetY) / (20 * grid.scale));  // replaced this with grid
        grid.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';  // replaced this.ctx with grid.ctx
        grid.ctx.fillRect(roomX * 20 * grid.scale + grid.offsetX, roomY * 20 * grid.scale + grid.offsetY, 20 * grid.scale, 20 * grid.scale);
    } else {
        grid.panMove(e.clientX, e.clientY);
    }

    grid.updateInfo(e.clientX, e.clientY);
    grid.drawGrid(e.clientX, e.clientY);
});

window.addEventListener('wheel', function (e) {
    grid.zoom(e.deltaY);
    grid.updateInfo(e.x, e.y);
});

grid.drawGrid();


window.debugRooms = function () {
    for (let room of grid.rooms) {
        console.log(room);
    }
}

// Function for hamburger menu
function openMenu() {
    var menu = document.getElementById('expanded-menu');
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}

// Function to handle zoneId input changes
function changeZoneId(input) {
    let zoneIdValue = input.value;
    if (zoneIdValue > 999 || zoneIdValue < -999) {
        input.setCustomValidity("Invalid field.");
    } else {
        input.setCustomValidity("");
        //Add leading zeros if the number is between -99 and 999 or 99 and -999
        if ((zoneIdValue > -100 && zoneIdValue < 1000) || (zoneIdValue < 100 && zoneIdValue > -1000)) {
            zoneIdValue = ('00' + zoneIdValue).slice(-3);
            input.value = zoneIdValue;
        }
    }
}

document.getElementById('zoneId').addEventListener('change', function () {
    grid.zoneId = this.value;
    grid.drawGrid();
});
