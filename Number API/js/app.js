// var API_URL = 'http://numbersapi.com/number/type';
// Variables

// API's base URL
var API_BASE_URL = 'https://numbersapi.com';

// API's Request Type (Possible values : trivia, math, date, or year)
var API_REQUEST_TYPE;

// Input Element
var inputElement = document.getElementById('numberInput');

// Output Element
var outputElement = document.getElementById('output');

/**
 * Generates random Request type for Number API.
 * Possible Outputs : trivia, math, date or year
 *
 * @return one request type from possible outputs.
 */
function getRequestType() {
  // Contians output value for function
  var returnType;

  // Generating random number between 0 and 4.
  var randomNumber = Math.floor(Math.random() * 4);

  // converting random number to return types
  switch (randomNumber) {
    case 0:
      returnType = 'trivia';
      break;
    case 1:
      returnType = 'math';
      break;
    case 2:
      returnType = 'date';
      break;
    default:
      returnType = 'year';
      break;
  }

  // Returning the value
  return returnType;
}

/**
 * Validates input value and shows error on invlaid input.
 * Possible Outputs : true, false
 *
 * @return true, if it is valid. False otherwise.
 */
function validateInput() {
  // contains output value of the function.
  var isValid = false;

  // Validating the input
  if(!isNaN(inputElement.value)) {
    // Setting isValid to true as the value is valid
    isValid = true;
  } else {
    // Showing the error if input is not empty
    if(inputElement.value != "") {
      outputElement.textContent = "Only numbers are allowed!";
      isValid = false;
    }
  }

  // Returning the value
  return isValid;
}

/**
 * Makes request to numbersapi.com and fetch the result from it.
 */
function fetchResult() {
  // Generating random request types
  API_REQUEST_TYPE = getRequestType();

  // Checking if the value is empty
  if(inputElement.value === "") {
    outputElement.textContent = "Enter a number to find secret.";
    return;
  }

  // Checking if input is valid.
  if(validateInput()) {
    // Getting the input
    var inputNumber = inputElement.value;

    // Creating Url fro api request
    var API_URL = `${API_BASE_URL}/${inputNumber}/${API_REQUEST_TYPE}`;

    // Creating differnt XMLHttpRequest objects according to the browsers
    if (window.XMLHttpRequest) {
      // For modern browsers
      http = new XMLHttpRequest();
    } else {
      // For old IE browsers
      http = new ActiveXObject("Microsoft.XMLHTTP");
    }

    // making http request to numbersapi.com
    http.open('GET', API_URL);
    // Changing input of output element with api's response
    http.onload = function() {
        outputElement.textContent = this.response;
      }
    http.send();
  }
}

//setting onChange event of Input Element
inputElement.addEventListener('input', function() {
  // Fetching result
  fetchResult();
});

// Stopping default behaviour of the form.
document.getElementById('api-form').addEventListener('submit', function(e) {
  e.preventDefault();
});
