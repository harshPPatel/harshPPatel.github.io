const SEVERITY="severity",ID="id",ASSIGNED_TO="assignedTo",INDEX_PAGE="index",PRINT_PAGE="print",ASCENDING="ascending",DESCENDING="descending",ISSUE_OPEN="Open",ISSUE_CLOSED="Closed";function getJSONData(){return JSON.parse(localStorage.getItem("issues"))}function getData(){return localStorage.getItem("issues")}function setJSONData(e){return localStorage.setItem("issues",JSON.stringify(e))}
// Constant Variables
const SEVERITY      =   'severity';
const ID            =   'id';
const ASSIGNED_TO   =   'assignedTo';
const INDEX_PAGE    =   'index';
const PRINT_PAGE    =   'print';
const ASCENDING     =   'ascending';
const DESCENDING    =   'descending';
const ISSUE_OPEN    =   'Open';
const ISSUE_CLOSED  =   'Closed';

function getJSONData() {
  var data = JSON.parse(localStorage.getItem('issues'));
  return data;
}

function getData() {
  return localStorage.getItem('issues');
}

function setJSONData(data) {
  return localStorage.setItem('issues', JSON.stringify(data));
}
function sortAscending(e,s){var n=new Array,r=getJSONData();switch(s===INDEX_PAGE?issueOutputElement.innerHTML="":issueTable.innerHTML=getHeadingRow(),e){case ID:r.forEach(function(e){n.push(e.id)}),n.sort().forEach(function(e){r.forEach(function(s){e===s.id&&(issueTable.innerHTML+=createIssuesRow(s))})});break;case ASSIGNED_TO:r.forEach(function(e){n.push(e.assignedTo.toUpperCase())});n.filter(function(e,s){return n.indexOf(e)>=s});n.sort().forEach(function(e){r.forEach(function(s){e==s.assignedTo.toUpperCase()&&(issueTable.innerHTML+=createIssuesRow(s))})});break;case SEVERITY:r.forEach(function(e){"high"===e.severity&&(s===INDEX_PAGE?issueOutputElement.innerHTML+=createIssueCard(e):issueTable.innerHTML+=createIssuesRow(e))}),r.forEach(function(e){"medium"===e.severity&&(s===INDEX_PAGE?issueOutputElement.innerHTML+=createIssueCard(e):issueTable.innerHTML+=createIssuesRow(e))}),r.forEach(function(e){"low"===e.severity&&(s===INDEX_PAGE?issueOutputElement.innerHTML+=createIssueCard(e):issueTable.innerHTML+=createIssuesRow(e))})}}function sortDescending(e,s){var n=new Array,r=getJSONData();switch(s===INDEX_PAGE?issueOutputElement.innerHTML="":issueTable.innerHTML=getHeadingRow(),e){case ID:r.forEach(function(e){n.push(e.id)}),n.sort().reverse().forEach(function(e){r.forEach(function(s){e==s.id&&(issueTable.innerHTML+=createIssuesRow(s))})});break;case ASSIGNED_TO:r.forEach(function(e){n.push(e.assignedTo.toUpperCase())});var i=n.filter(function(e,s){return n.indexOf(e)>=s});(n=i).sort().reverse().forEach(function(e){r.forEach(function(s){e==s.assignedTo.toUpperCase()&&(issueTable.innerHTML+=createIssuesRow(s))})});break;case SEVERITY:r.forEach(function(e){"low"===e.severity&&(s===INDEX_PAGE?issueOutputElement.innerHTML+=createIssueCard(e):issueTable.innerHTML+=createIssuesRow(e))}),r.forEach(function(e){"medium"===e.severity&&(s===INDEX_PAGE?issueOutputElement.innerHTML+=createIssueCard(e):issueTable.innerHTML+=createIssuesRow(e))}),r.forEach(function(e){"high"===e.severity&&(s===INDEX_PAGE?issueOutputElement.innerHTML+=createIssueCard(e):issueTable.innerHTML+=createIssuesRow(e))})}}
function sortAscending(option, page) {
  var sortedArray   =   new Array();
  var issues        =   getJSONData();

  if ( page === INDEX_PAGE ) {
    issueOutputElement.innerHTML = '';
  } else {
    issueTable.innerHTML = getHeadingRow();
  }

  switch (option) {
    case ID:
      issues.forEach(function(issue) {
        sortedArray.push(issue.id);
      });
      sortedArray
        .sort()
        .forEach(function(sortedId) {
          issues.forEach(function(issue) {
            if (sortedId === issue.id) {
              issueTable.innerHTML += createIssuesRow(issue);
            }
          });
        });
      break;

    case ASSIGNED_TO:
      issues.forEach(function(issue) {
        sortedArray.push(issue.assignedTo.toUpperCase());
      });
      var issuesUnique  =   sortedArray.filter( function(item, index) {
        return sortedArray.indexOf(item) >= index;
      });
      sortedArray
        .sort()
        .forEach(function(sortedAssignedTo) {
          issues.forEach(function(issue) {
            if (sortedAssignedTo == issue.assignedTo.toUpperCase()) {
              issueTable.innerHTML += createIssuesRow(issue);
            }
          });
        });
      break;

    case SEVERITY:
      issues.forEach( function(issue) {
        if (issue.severity === 'high') {
          if (page === INDEX_PAGE) {
            issueOutputElement.innerHTML += createIssueCard(issue);
          } else {
            issueTable.innerHTML += createIssuesRow(issue);
          }
        }
      });
      issues.forEach( function(issue) {
        if (issue.severity === 'medium') {
          if (page === INDEX_PAGE) {
            issueOutputElement.innerHTML += createIssueCard(issue);
          } else {
            issueTable.innerHTML += createIssuesRow(issue);
          }
        }
      });
      issues.forEach(function(issue) {
        if (issue.severity === 'low') {
          if (page === INDEX_PAGE) {
            issueOutputElement.innerHTML += createIssueCard(issue);
          } else {
            issueTable.innerHTML += createIssuesRow(issue);
          }
        }
      });
      break;
  }
}

function sortDescending(option, page) {
  var sortedArray =   new Array();
  var issues      =   getJSONData();
  if(page === INDEX_PAGE) {
    issueOutputElement.innerHTML = '';
  } else {
    issueTable.innerHTML = getHeadingRow();
  }

  switch (option) {
    case ID:
      issues.forEach(function(issue) {
        sortedArray.push(issue.id);
      });
      sortedArray
        .sort()
        .reverse()
        .forEach( function(sortedId) {
          issues.forEach( function(issue) {
            if (sortedId == issue.id) {
              issueTable.innerHTML += createIssuesRow(issue);
            }
          });
        });
      break;
    
    case ASSIGNED_TO:
      issues.forEach(function(issue) {
        sortedArray.push(issue.assignedTo.toUpperCase());
      });
      var issuesUnique  =   sortedArray.filter( function(item, index) {
        return sortedArray.indexOf(item) >= index;
      });
      sortedArray = issuesUnique;
      sortedArray
        .sort()
        .reverse()
        .forEach( function(sortedAssignedTo) {
          issues.forEach(function(issue) {
            if (sortedAssignedTo == issue.assignedTo.toUpperCase()) {
              issueTable.innerHTML += createIssuesRow(issue);
            }
          });
        });
      break;

    case SEVERITY:
      issues.forEach(function(issue) {
        if (issue.severity === 'low') {
          if (page === INDEX_PAGE) {
            issueOutputElement.innerHTML += createIssueCard(issue);
          } else {
            issueTable.innerHTML += createIssuesRow(issue);
          }
        }
      });
      issues.forEach(function(issue) {
        if (issue.severity === 'medium') {
          if (page === INDEX_PAGE) {
            issueOutputElement.innerHTML += createIssueCard(issue);
          } else {
            issueTable.innerHTML += createIssuesRow(issue);
          }
        }
      });
      issues.forEach(function(issue) {
        if (issue.severity === 'high') {
          if (page === INDEX_PAGE) {
            issueOutputElement.innerHTML += createIssueCard(issue);
          } else {
            issueTable.innerHTML += createIssuesRow(issue);
          }
        }
      });
      break;
  }
}