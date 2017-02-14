// Copyright (c) 2017, Intel Corporation.

// Sample code for Arduino 101 w/ Grove LCD and Grove pushbutton on IO2
// Clicking the button toggles a sound level meter up and down on the LCD.

console.log("Audio Level sample...");

var pins = require("arduino101_pins");
var gpio = require("gpio");
var lcd = require("grove_lcd");

// set initial state
var funcConfig = lcd.GLCD_FS_ROWS_2
               | lcd.GLCD_FS_DOT_SIZE_LITTLE
               | lcd.GLCD_FS_8BIT_MODE;

var glcd = lcd.init();
glcd.setFunction(funcConfig);
glcd.setDisplayState(lcd.GLCD_DS_DISPLAY_ON);

glcd.clear();
glcd.setColor(0, 32, 0);

var pos = 0;
var dir = 1;

var brightness = 0;
var debounce = false;

glcd.setCursorPos(0, 0);
glcd.print('|');
glcd.setCursorPos(0, 1);
glcd.print('|');

var button = gpio.open({ pin: pins.IO2, direction: 'in', edge: 'rising' });
button.onchange = function (event) {
    if (debounce)
        return;

    debounce = true;

    var oldpos = pos;

    if (pos + dir > 15)
        dir = -1;
    if (pos + dir < 0)
        dir = 1;
    pos += dir;

    if (pos >= 12)
        brightness = 255;
    else {
        brightness = ((255 - 32) / 11.0) * pos + 32;
    }

    if (pos <= 12)
        glcd.setColor(0, brightness, 0);
    else
        glcd.setColor(brightness, 0, 0);

    var init = oldpos;
    var draw = "=|";
    if (pos < oldpos) {
        init = pos;
        draw = "| ";
    }
    glcd.setCursorPos(init, 0);
    glcd.print(draw);
    glcd.setCursorPos(init, 1);
    glcd.print(draw);

    setTimeout(resetDebounce, 20);
}

function resetDebounce() {
    debounce = false;
}
