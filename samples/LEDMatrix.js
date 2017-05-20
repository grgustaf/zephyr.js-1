// Copyright (c) 2017, Intel Corporation.

// Sample code demonstrating how to use I2C to communicate with slave devices

// Hardware Requirements:
//   - A Grove LCD
//   - pull-up resistors for SDA and SCL, we use two 10k resistors,
//   - Choose resistors that work with your LCD hardware. The ones listed here
//     work for us with the Grove LCD; your mileage may vary.
// Wiring:
//   For LCD:
//     - Wire a pullup resistor between power (5V) and SDA on the LCD
//     - Wire a pullup resistor between power (5V) and SCL on the LCD
//     - Wire SDA on the LED bargraph to SDA on the Arduino 101
//     - Wire SCL on the LED bargraph to SCL on the Arduino 101
//     - Wire power (5V) and ground accordingly

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

LEDMatrix.prototype.setBar = function (bar, color) {
    // requires: bar is 0-23, color is one of LED_ color values above
    //  effects: updates internal state; still need to call updateDisplay to
    //             write to the LEDs
    bar = clamp(bar, 0, 63);

    // split into bars into thirds
    var third = (bar % 32) / 4 | 0;
    var bit = bar % 4;
    var mask = 1 << bit;
    if (bar >= 32) {
        mask <<= 4;
    }

    var index = third * 2;
    var byte = this.buffer.readUInt8(index + 1);
    byte = byte & ~mask;
    if (color & LED_RED) {
        byte = byte | mask;
    }
    this.buffer.writeUInt8(byte, index + 1);

    index++;
    byte = this.buffer.readUInt8(index + 1);
    byte = byte & ~mask;
    if (color & LED_GREEN) {
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

setInterval(function () {
    last = bar;
    bar += dir;
    if (bar >= 63) {
        bar = 63;
        dir *= -1;
    }
    else if (bar < 0) {
        color = (color + 1) % 3;
        if (!color) {
            mode = (mode + 1) % modes;
        }
        bar = 0;
        dir = 1;
        if (mode >= 3) {
            dir = 2;
        }
    }

    if (mode == 0) {
        graph.setBar(last, LED_OFF);
    }

    var col = colors[color];
    if (mode == 2 && dir < 0) {
        col = LED_OFF;
    }
    graph.setBar(bar, col);
    graph.updateDisplay();
}, 25);
