var element = document.getElementById('--js-random-color');
var body = document.querySelector('body');
var colorSet = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
var counter = 0;
var copyColor;

function randomColorGenerator() {
    element.disabled = false;
    let color = "#";
    for (let index = 0; index < 6; index++) {
        let randomNumber = Math.floor(Math.random() * colorSet.length);
        color += colorSet[randomNumber];
    }
    body.style.backgroundColor = color;
    copyColor = color;
    element.value = color;
    if(tinycolor(color).isLight()) {
        body.style.color = "#1e272e";
    } else {
        body.style.color = "#ffffff";
    }
}

function fontColor(color) {
    if (color.substring(0,3) == "#00" || color.substring(0,3) == "#010") {
        console.log("Light color");

    }
}

function copyText() {
    element.select();
    document.execCommand("copy");
    alert("Copied! " + copyColor);
    element.disabled = true;
}

window.onload = function() {
    if (counter == 0) {
        element.value = "Press Space / Click";
    }

    element.addEventListener("click", copyText);

    body.addEventListener("click", randomColorGenerator);

    document.body.onkeyup = function(e) {
        if (e.keyCode == 32) {
            randomColorGenerator();
        }
    }
};
randomColorGenerator();
