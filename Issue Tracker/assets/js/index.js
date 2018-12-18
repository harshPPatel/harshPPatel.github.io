const issueDescriptionInput =   document.getElementById("issueDescriptionInput"); 
const issueSeverityInput    =   document.getElementById("issueSeverityInput"); 
const issueAssignedToInput  =   document.getElementById("issueAssignedToInput");
const issueSubmitButton     =   document.getElementById("issueSubmit");
const issueOutputElement    =   document.getElementById("issueListOutput");
const issueSortInput        =   document.getElementById("sortIssueList");
const defaultEmployees      =   [ 'Bruce',
                                  'Snyder',
                                  'Taylor',
                                  'Mark',
                                  'Monica',
                                  'Sachin',
                                  'Richard',
                                  'Parker',
                                  'Zach',
                                  'Mike'
                                ];

issueDescriptionInput.addEventListener('click', function() {
  issueDescriptionInput.classList.remove('invalid');
});

function createIssueCard(issue) {
  var rawTemplate       =   document.getElementById("issueCardTemplate").innerHTML;
  var compiledTemplate  =   Handlebars.compile(rawTemplate);
  return compiledTemplate(issue);
}

function autoAssign() {
  var randomNumber = Math.floor(Math.random() * defaultEmployees.length);
  return defaultEmployees[randomNumber];
}

function addIssue(event) {
  event.preventDefault();
  if (issueDescriptionInput.value === '') {
    issueDescriptionInput.classList.add('invalid');
    return;
  }

  var issueDescription  =   issueDescriptionInput.value;
  var issueAssignedTo   =   issueAssignedToInput.value;
  var issueSeverity     =   issueSeverityInput.value;
  var id                =   chance.guid();
  var issueStatus       =   ISSUE_OPEN;

  issueAssignedTo   =   issueAssignedTo == '' ? autoAssign() : issueAssignedTo;
  issueSeverity     =   issueSeverity == '' ? 'low' : issueSeverity;

  var issue = {
    id: id,
    description: issueDescription,
    severity: issueSeverity,
    assignedTo: issueAssignedTo,
    status: issueStatus
  };

  if ( getData() === null ) {
    var issues = new Array();
    issues.push(issue);
    setJSONData(issues);
  } else {
    var issues = getJSONData();
    issues.push(issue);
    setJSONData(issues);
  }

  issueDescriptionInput.value   = '';
    issueAssignedToInput.value  = '';
      issueSeverityInput.value  = 'low';

  fetchIssuesCard();
}

function setStatusClosed(id) {
  var issues = getJSONData();
  issues.forEach(function(issue) {
    if (issue.id == id) {
      issue.status = ISSUE_CLOSED;
    }
  });
  setJSONData(issues);
  fetchIssuesCard();
}

function deleteIssue(id) {
  var issues = getJSONData();
  issues.forEach(function(issue, index) {
    if(issue.id == id) {
      issues.splice(index, 1);
    }
  });
  setJSONData(issues);
  fetchIssuesCard();
  // setting default value in sort options
  if(getJSONData().length == 0) {
    issueSortInput.value = 'hide';
  }
}

issueSortInput.addEventListener('input', function() {  
  if (issueSortInput.value == ASCENDING) {
    sortAscending(SEVERITY, INDEX_PAGE);
  }
  if (issueSortInput.value == DESCENDING) {
    sortDescending(SEVERITY, INDEX_PAGE);
  }
});

function fetchIssuesCard() {
  var issues = getJSONData();
  if(issues === null || issues.length == 0) {
    issueOutputElement.innerHTML =  "<div class=\"welcome-message\">" + 
                                      "<h3>Yeah! No Issues Found!</h3>" +
                                    "</div>";
  } else if (issueSortInput.value == ASCENDING) {
    sortAscending(SEVERITY, INDEX_PAGE);
    
  } else if (issueSortInput.value == DESCENDING) {
    sortDescending(SEVERITY, INDEX_PAGE);
  } else {
    issueOutputElement.innerHTML = "";
    issues
      .reverse()
      .forEach(function(issue) {
        issueOutputElement.innerHTML += createIssueCard(issue);
      });
  }
}

issueSubmitButton.addEventListener('click', addIssue);
var modalOverlay =   document.querySelector('#modalContainer .overlay');
var modalContainer = document.querySelector('#modalContainer');
var modalCloseElement = document.querySelectorAll('.--js-modal-close');
var modalBody = document.querySelector('#modalContainer .modal');
var body = document.body;


function isContainerOpen(){
  if (modalContainer.style.display == 'flex') {
    return true;
  } else {
    return false;
  }
}

function setBodyOverflow() {
  if (isContainerOpen()) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'scroll';
  }
}

function containerFunction() {
  if (isContainerOpen()) {
    modalContainer.style.display = "none";
  } else {
    modalContainer.style.display = "flex";
  }
}

function modalOverlayStyle() {
  if (isContainerOpen()) {
    modalOverlay.animate([
      {
        opacity: '1'
      },
      {
        opacity: '0'
      }
    ], 500);
    modalOverlay.style.opacity = '0';
  } else {
    modalOverlay.animate([
      {
        opacity: '0'
      },
      {
        opacity: '1'
      }
    ], 500);
    modalOverlay.style.opacity = '1';
  }
}

function modalBodyStyle() {
  if (isContainerOpen()) {
    modalBody.animate([
      {
        opacity: '1',
        transform: 'scale(1)'
      },
      {
        opacity: '0',
        transform: 'scale(0.9)'
      }
    ], 200);
    modalBody.style.opacity = '0';
    modalBody.style.transform = 'scale(0.9)';
  } else {
    modalBody.animate([
      {
        opacity: '0',
        transform: 'scale(0.9)'
      },
      {
        opacity: '1',
        transform: 'scale(1)'
      }
    ], {
      delay: 100,
      duration: 200
    });
    modalBody.style.opacity = '1';
    modalBody.style.transform = 'scale(1)';
  }
}

function modal() {
  modalBodyStyle();
  modalOverlayStyle();
  setTimeout(function() {
    containerFunction();
  }, 150);
  setTimeout(function() {
    setBodyOverflow();
  }, 160);
}

modalCloseElement.forEach(function(element) {
  element.addEventListener('click', function(event) {
    event.preventDefault();
    modal();
  });
});
  

// Use  : modal()

const JSON_SOURCE   =   'assets/json/quote.json';
const quoteElement  =   document.getElementById('--js-random-quote');
const authorElement =   document.getElementById('--js-random-quote-author');
var randomQuoteData;

// fetching Quote JSOn Data from the server
function fetchJSONData() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      randomQuoteData = JSON.parse(xhttp.response);
    }
  };
  xhttp.open("GET", JSON_SOURCE, true);
  xhttp.send();
}

// getting random quote
function getRandomQuote() {
  var randomNumber = Math.floor( Math.random() * randomQuoteData[0].quotes.length );
  var quote = randomQuoteData[0].quotes[randomNumber].quote;
  var author = randomQuoteData[0].quotes[randomNumber].author;
  quoteElement.innerHTML = quote;
  authorElement.innerHTML = '- ' + author;
}

// running functions onload
window.onload = function() {
  fetchJSONData();
  setTimeout(getRandomQuote, 10);
}
const searchInput = document.getElementById("searchInput");
const searchOptionInput = document.getElementById("searchOptionInput");
const noSearchFoundHTML = '<div class="welcome-message"><h3>No Search Found!</h3></div>';

if (searchInput !== null) {
  searchInput.addEventListener('input', function () {
    var searchOptionValue = searchOptionInput.value;
    searchOption(searchOptionValue);
  });
  
  searchOptionInput.addEventListener('change', function () {
    searchInput.focus();  
  })
}

function searchOption(option) {
  switch (option) {
    case "id":
      idSearch();
      break;
    case "assignedTo":
    default:
      assignedToSearch();
      break;
  }
}

function doesInclude(option, issue) {
  if (option === 'id') {
    return issue.id.toUpperCase().includes(searchInput.value.toUpperCase());
  } else {
    return issue.assignedTo.toUpperCase().includes(searchInput.value.toUpperCase());
  }
}

function idSearch() {
  var issues = JSON.parse(localStorage.getItem('issues'));
  if (issues === null || issues === undefined || issues.length === 0) {
    modal();
    searchInput.blur();
    searchInput.value = '';
  } else {
    issueOutputElement.innerHTML = '';
    issues.reverse().forEach(function(issue) {
      if (doesInclude('id', issue)) {
        issueOutputElement.innerHTML += createIssueCard(issue);
        return;
      }
    });
    if(issueOutputElement.innerHTML == '') {
      issueOutputElement.innerHTML = noSearchFoundHTML;
    }
  }
}

function assignedToSearch() {
  var issues = JSON.parse(localStorage.getItem('issues'));
  if (issues === null || issues === undefined || issues.length === 0) {
    modal();
    searchInput.blur();
    searchInput.value = '';
  } else {
    issueOutputElement.innerHTML = '';
    issues.reverse().forEach(function(issue) {
      if (doesInclude('assignedTo', issue)) {
        issueOutputElement.innerHTML += createIssueCard(issue);
        return;
      }
    });
    if(issueOutputElement.innerHTML == '') {
      issueOutputElement.innerHTML = noSearchFoundHTML;
    }
  }
}

