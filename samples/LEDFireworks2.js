// Copyright (c) 2017, Intel Corporation.

console.log('Starting LED Fireworks sample...');

// import i2c module
var i2c = require('i2c');
var aio = require('aio');
var pins = require('arduino101_pins');

var fwPot = aio.open({device: 0, pin: pins.A0});
var delayPot = aio.open({device: 0, pin: pins.A1});

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

var colors = [LED_RED, LED_YELLOW, LED_GREEN];

var bar = -1;
var dir = 1;
var color = 0;
var mode = 0;
var modes = 5;

var Firework = function(x, y, color, dir, count) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.dir = dir;  // dir true means diagonal
    this.size = -1;
    this.count = count;
}

fireworks = []
derived = []

Firework.prototype = {
    addPoint: function(points, x, y) {
        if (x < 0 || x > 7 || y < 0 || y > 7)
            return;
        points.push([x, y]);
    },

    genPoints: function () {
        var points = [];
        if (this.dir & 0x1) {  // horiz + vert
            this.addPoint(points, this.x + this.size, this.y);
            this.addPoint(points, this.x - this.size, this.y);
            this.addPoint(points, this.x, this.y + this.size);
            this.addPoint(points, this.x, this.y - this.size);
        }
        if (this.dir & 0x2) {  // diagonal
            this.addPoint(points, this.x + this.size, this.y + this.size);
            this.addPoint(points, this.x - this.size, this.y + this.size);
            this.addPoint(points, this.x + this.size, this.y - this.size);
            this.addPoint(points, this.x - this.size, this.y - this.size);
        }
        return points;
    },

    draw: function () {
        // return true if firework is done
        if (this.size == -1) {
            this.size = 0;
            graph.setPixel(this.x, this.y, this.color);
            if (this.count > 1) {
                derived.push(new Firework(this.x, this.y, this.color,
                                          rnd(1, 3), this.count - 1));
            }
            return false;
        }
        else if (this.size == 0) {
            graph.setPixel(this.x, this.y, 0);
        }
        else {
            var points = this.genPoints();
            for (p in points) {
                graph.setPixel(points[p][0], points[p][1], 0);
            }
        }
        this.size += 1;
        if (this.size >= 1) {
            var points = this.genPoints();
            for (p in points) {
                graph.setPixel(points[p][0], points[p][1], this.color);
            }
            return !points.length;
        }
    }
}

function rnd(low, high) {
    return (Math.random() * (high - low + 1) | 0) + low;
}

ticks = 0;
fwFreq = 10;

var delay = 125;

function animate() {
    if (ticks++ % fwFreq == 0) {
        fireworks.push(new Firework(rnd(2, 5), rnd(2, 5), rnd(1, 3),
                                    rnd(1, 3), rnd(1, 4)));

        fwPot.readAsync(function(rawValue) {
            if (rawValue < 2000) {
                fwFreq = (rawValue / 200 + 2) | 0;
            }
            else {
                fwFreq = (rawValue / 400 + 7) | 0;
            }
            ticks = 1
        });

        delayPot.readAsync(function(rawValue) {
            delay = 20 + rawValue / 10;
        });
    }

    previous = fireworks;
    fireworks = []
    for (f in previous) {
        if (!previous[f].draw()) {
            fireworks.push(previous[f]);
        }
    }
    fireworks = fireworks.concat(derived);
    derived = [];
    graph.updateDisplay();

    setTimeout(animate, delay);
}

setTimeout(animate, delay);
