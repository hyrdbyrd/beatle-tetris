// TODO: global scope

const main = document.querySelector('.main');
const game = main.querySelector('.game');
const scoreBar = main.querySelector('.score');
const ctx = game.getContext('2d');
const SCALE = 24;
const colors = [
    null,
    'red',
    'blue',
    'pink',
    'green',
    'yellow',
    'orange',
    'purple'
];
ctx.scale(SCALE, SCALE);

const matrix = [
    [0, 0, 0],
    [0, 1, 1],
    [0, 0, 0]
];

const arena = createMatrix(12 * 20 / SCALE | 0, 20 * 20 / SCALE | 0);
const player = {
    pos: {
        x: 0,
        y: 0
    },
    matrix: matrix,
    score: 0
}

function rand (min, max) {
    return Math.random() * (max - min + 1) + min | 0;
}

function createPiece () {
    return [
        [0, 0, 0],
        [0, rand(1, colors.length - 1), rand(1, colors.length - 1)],
        [0, 0, 0]
    ]
}

function playerReset() {
    player.matrix = createPiece();
    player.pos.y = -1; // Becose NOW drop
    player.pos.x =
        (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0) - 1;
    if (collide(arena, player)) {
        player.score = 0;
        arena.forEach(row => row.fill(0));
    }
    scoreUpd();
}

function collide(arena, player) {
    const [m, pos] = [player.matrix, player.pos];
    for (let y = 1; y < m.length; y++)
        for (let x = 1; x < m[y].length; x++)
            if (
                m[y][x] !== 0 &&
                (arena[y + pos.y] &&
                arena[y + pos.y][x + pos.x]) !== 0
            ) return true;
    return false;
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((val, x) => {
            if (val !== 0) {
                ctx.fillStyle = colors[val];
                ctx.fillRect(
                    x + offset.x,
                    y + offset.y,
                    1, 1
                );
            }
        })
    });
}

function isSame(arena, x, y, c) {
    return c === null || arena[y] && arena[y][x] === c;
}

function collectBlocks(arena, x, y, dirs = {y: 0, x: 0}, initialColor = null, blocks = []) {
    if (!isSame(arena, x, y, initialColor)) return blocks;

    const color = arena[y][x];
    const dirX = dirs.x === 0 ? [-1, 1] : dirs.x;
    const dirY = dirs.y === 0 ? [-1, 1] : dirs.y;

    function getStash(deltaX, deltaY) {
        return collectBlocks(arena, x + deltaX, y + deltaY, { y: deltaY, x: deltaX }, color);
    }

    blocks.push({ y, x, color });

    if (Array.isArray(dirY) && Array.isArray(dirX)) {
        blocks = blocks.concat(
            getStash(dirX[0], 0), // [0;y]
            getStash(dirX[1], 0), // [1;y]
            getStash(0, dirY[0]), // [x;0]
            getStash(0, dirY[1])  // [x;1]
        );
    } else if (Array.isArray(dirX)) {
        blocks = blocks.concat(
            getStash(dirX[0], 0), // [0;y]
            getStash(dirX[1], 0), // [1;y]
            getStash(0, dirY)     // [x;d]
        );
    } else if (Array.isArray(dirY)) {
        blocks = blocks.concat(
            getStash(0, dirY[0]), // [x;0]
            getStash(0, dirY[1]), // [x;1]
            getStash(dirX, 0),    // [d;y]
        );
    } else {
        blocks = blocks.concat(
            getStash(dirX, 0),   // [d;y]
            getStash(0, dirY)    // [x;d]
        );
    }

    return blocks;
}

function check(arena, player) {
    arena.forEach((row, y) => {
        row.forEach((val, x) => {
            if (!val) return;

            const blocks = new Set(collectBlocks(arena, x, y));

            if (blocks.size < 3) return;

            player.score += blocks.size * 10;

            blocks.forEach(e => {
                arena[e.y][e.x] = 0;
            });

            toNormal(arena);
            check(arena, player);
        })
    });
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, game.width, game.height);

    drawMatrix(arena, {x: 0, y: 0})
    drawMatrix(player.matrix, player.pos);
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval)
        playerDrop();
    draw();
    requestAnimationFrame(update);
}

function playerRotate (dir=1) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[y][x],
                matrix[x][y]
            ] = [
                matrix[x][y],
                matrix[y][x]
            ];

            if (dir > 0)
                matrix.forEach(row => row.reverse())
            else
                matrix.reverse();
        }
    }
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player))
        player.pos.x -= dir;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--)
        matrix.push(new Array(w).fill(0));
    return matrix;
}

function toNormal (arena) {
    let flag = true;
    while (flag) {
        flag = false;
        for (let y = 0; y < arena.length - 1; y++) {
            row = arena[y];
            for (let x = 0; x < row.length; x++)
                if (row[x] !== 0 && arena[y + 1][x] === 0) {
                    [arena[y + 1][x], row[x]] = [row[x], 0];
                    flag = true;
                }
        }
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((val, x) => {
            if (val !== 0)
                arena[y + player.pos.y][x + player.pos.x] = val;
        })
    });
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        toNormal(arena);
        check(arena, player);
        playerReset();
    }
    dropCounter = 0;
}


function createScoreBar() {
    scoreBar.innerHTML = player.score;
}

function scoreUpd () {
    scoreBar.innerHTML = player.score;
};


document.addEventListener('keydown', e => {
    const c = e.keyCode;
    if (c === 39)        // r-ar
        playerMove(1);  // right
    else if (c === 37)   // l-ar
        playerMove(-1); // left
    else if (c === 38)    // t-ar
        playerRotate()  // rotate
    else if (c === 40)   // d-ar
        playerDrop()    // drop
});

playerReset();
update();
