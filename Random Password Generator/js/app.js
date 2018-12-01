var keylist = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890~!@#$%^&*()_";
var temporaryKeylist = "";
var temporary = "";
var randomNumber = 0;
var lengthElement = document.passGenerator.length;
var outputElement = document.getElementById('output');
var specialLettersElement = document.getElementById('specialLetters');
var capitalLettersElement = document.getElementById('capitalLetters');
// Background Change JS Variables
var body = document.querySelector('body');
var colorSet = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function specialLetters() {
    if (specialLettersElement.checked == true) {
        return true;      
    } else {
        return false;
    }
}

function  capitalLetters() {
    if (capitalLettersElement.checked == true) {
        return true;      
    } else {
        return false;
    }
}

function generateKeylist() {
    temporaryKeylist = "";
    if (specialLetters()) {
        if (capitalLetters()) {
            temporaryKeylist = keylist;
            console.log(temporaryKeylist);
            
        } else {
            temporaryKeylist = keylist.substring(26, keylist.length);
            console.log(temporaryKeylist);
        }
    } else {
        if (capitalLetters()) {
            temporaryKeylist = keylist.substring(0, keylist.length - 12);
            console.log(temporaryKeylist);
        } else {
            temporaryKeylist = keylist.substring(26, keylist.length - 12);
            console.log(temporaryKeylist);
        }
    }
}

function generatePassword(length) {
    temporary = "";
    randomNumber = 0;
    for (var i = 0; i < length; i++) {
        randomNumber = Math.floor(Math.random() * temporaryKeylist.length);
        temporary += temporaryKeylist.charAt(randomNumber);
    }
    return temporary;
}

function formSubmit() {
    generateKeylist();
    outputElement.value = generatePassword(lengthElement.value);
}


// Background random generator
function randomColorGenerator() {
    let color = "#";
    for (let index = 0; index < 6; index++) {
        let randomNumber = Math.floor(Math.random() * colorSet.length);
        color += colorSet[randomNumber];
    }
    body.style.backgroundColor = color;
    if(tinycolor(color).isLight()) {
        body.style.color = "#1e272e";
    } else {
        body.style.color = "#ffffff";
        document.passGenerator.length.style.color = "#ffffff";
        document.passGenerator.output.style.color = "#ffffff";
        document.passGenerator.length.style.borderColor = "#ffffff";
        document.passGenerator.output.style.borderColor = "#ffffff";
        document.passGenerator.button.style.color = "#1e272e";
        document.passGenerator.button.style.backgroundColor = "#ffffff";
    }
}
randomColorGenerator();