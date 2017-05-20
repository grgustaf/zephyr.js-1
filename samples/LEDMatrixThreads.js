// Copyright (c) 2017, Intel Corporation.

// Sample code demonstrating how to use I2C to communicate with slave devices

console.log('Starting matrix sample...');

// import i2c module
var i2c = require("i2c");

var I2C_ADDR = 0x70;  // solder jumpers can adjust this in range 0x70 - 0x77

var i2cDevice = i2c.open({bus: 0, speed: 100});

// HT16K33 values
var HT_OSCILLATOR_ON = 0x21;  // system setup register
var HT_BRIGHTNESS = 0xE0;     // bottom nibble defines brightness 0-15

function LEDMatrix(addr) {
    this.addr = addr;
    this.buffer = new Buffer(17);
    for (var i = 0; i < 17; i++) {
        this.buffer.writeUInt8(0, i);
    }

    i2cDevice.write(addr, new Buffer([HT_OSCILLATOR_ON]));
    i2cDevice.write(addr, new Buffer([0x81]));
    i2cDevice.write(addr, new Buffer([HT_BRIGHTNESS | 15]));
}

// LED color values
var LED_OFF = 0;
var LED_RED = 1;
var LED_GREEN = 2;
var LED_YELLOW = LED_RED | LED_GREEN;

function clamp(value, min, max) {
    // requires: min and max must be integers
    //  effects: clamps value to range min-max, rounded to nearest integer
    if (value < min) {
        return min;
    }
    else if (value > max) {
        return max;
    }
    return (value + 0.5) | 0;
}

LEDMatrix.prototype.init = function () {
    this.setBrightness(15);
    this.updateDisplay();
}

LEDMatrix.prototype.setBrightness = function (level) {
    // requires: level should be 0-15
    level = clamp(level, 0, 15);
    var b = new Buffer([HT_BRIGHTNESS | level]);
    i2cDevice.write(this.addr, b);
}

LEDMatrix.prototype.setPixel = function (row, col, color) {
    row = clamp(row, 0, 7);
    col = clamp(col, 0, 7);

    var index = row * 2;
    var mask = 1 << col;

    var byte = this.buffer.readUInt8(index + 1);
    byte = byte & ~mask;
    if (color & LED_GREEN) {
        byte = byte | mask;
    }
    this.buffer.writeUInt8(byte, index + 1);
    index++;
    byte = this.buffer.readUInt8(index + 1);
    byte = byte & ~mask;
    if (color & LED_RED) {
        byte = byte | mask;
    }
    this.buffer.writeUInt8(byte, index + 1);
}

LEDMatrix.prototype.updateDisplay = function () {
    i2cDevice.write(this.addr, this.buffer);
}

graph = new LEDMatrix(I2C_ADDR);
graph.init();

var TICK = 10;

var INIT_THREADS = 17;
var MAX_THREADS = INIT_THREADS;
var threads = 0;

function fill(color, mode) {
    if (threads >= MAX_THREADS) {
        return;
    }
    threads++;
    graph.setBrightness(threads + 1);
    var count = 0;
    var timer = setInterval(function () {
        var row = (count / 8 | 0) % 8;
        var col = count % 8;
        if (mode >= 4) {
            row = 7 - row;
        }
        if ((mode >> 1) & 1) {
            col = 7 - col;
        }
        if (mode & 1) {
            var tmp = row;
            row = col;
            col = tmp;
        }
        graph.setPixel(row, col, color);
        graph.updateDisplay();
        if (++count == 64) {
            clearInterval(timer);
            threads--;
        }
    }, TICK);
}

var colors = [LED_OFF, LED_RED, LED_YELLOW, LED_GREEN];
var useColors = 2;

var mode = 0;
var INIT_TIMEOUT = 1280;
var timeout = INIT_TIMEOUT;
function controller() {
    var color = colors[mode % useColors];
    fill(color, mode / useColors | 0);
    if (++mode >= 8 * useColors) {
        mode = 0;
        if (threads < MAX_THREADS) {
            timeout -= 80;
        }
        else {
            MAX_THREADS--;
            if (MAX_THREADS <= 0) {
                MAX_THREADS = INIT_THREADS;
                timeout = INIT_TIMEOUT;
                useColors = (useColors - 1) % 3 + 2;
            }
        }
    }

    setTimeout(controller, timeout);
};

controller();
