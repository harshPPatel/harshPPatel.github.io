const issueTable                  = document.querySelector('#issueTable tbody');
const issueSortInputById          = document.getElementById('sortIssueListById');
const issueSortInputBySeverity    = document.getElementById('sortIssueListBySeverity');
const issueSortInputByAssignedTo  = document.getElementById('sortIssueListByAssigned');
const printPageIssueSortInput     = document.getElementById('printPageSortForm');

function getHeadingRow() {
  return '<tr>' + 
            '<th> Id </th>' + 
            '<th> Status</th>' + 
            '<th> Description</th>' + 
            '<th> Severity </th>' + 
            '<th> Assigned To </th>' + 
          '</tr>';
}

function createIssuesRow(issue) {
  return '<tr>' + 
            '<td>' + issue.id           + '</td>' + 
            '<td>' + issue.status       + '</td>' + 
            '<td>' + issue.description  + '</td>' + 
            '<td>' + issue.severity     + '</td>' + 
            '<td>' + issue.assignedTo   + '</td>' + 
          '</tr>';
}

issueSortInputById.addEventListener('input', function() {  
  if (issueSortInputById.value === ASCENDING) {
    sortAscending(ID, PRINT_PAGE);
  }

  if (issueSortInputById.value === DESCENDING) {
    sortDescending(ID, PRINT_PAGE);
  }
  
  issueSortInputById.blur();
  issueSortInputBySeverity.blur();
  issueSortInputByAssignedTo.blur();
  issueSortInputBySeverity.value = 'hide';
  issueSortInputByAssignedTo.value = 'hide';
});

issueSortInputBySeverity.addEventListener( 'input', function() {  
  if (issueSortInputBySeverity.value === ASCENDING) {
    sortAscending(SEVERITY, PRINT_PAGE);
  }
  if (issueSortInputBySeverity.value === DESCENDING) {
    sortDescending(SEVERITY, PRINT_PAGE);
  }
  issueSortInputById.blur();
  issueSortInputById.value = 'hide';
  issueSortInputBySeverity.blur();
  issueSortInputByAssignedTo.blur();
  issueSortInputByAssignedTo.value = 'hide';
});

issueSortInputByAssignedTo.addEventListener( 'input', function() {  
  if (issueSortInputByAssignedTo.value === ASCENDING) {
    sortAscending(ASSIGNED_TO, PRINT_PAGE);
  }
  if (issueSortInputByAssignedTo.value === DESCENDING) {
    sortDescending(ASSIGNED_TO, PRINT_PAGE);
  }
  issueSortInputById.blur();
  issueSortInputById.value = 'hide';
  issueSortInputBySeverity.blur();
  issueSortInputBySeverity.value = 'hide';
  issueSortInputByAssignedTo.blur();
});

function fetchIssuesRow() {
  var issues = getJSONData();
  issueTable.innerHTML = getHeadingRow();
  issues
    .reverse()
    .forEach(function(issue) {
      issueTable.innerHTML += createIssuesRow(issue);
    });
}

window.onload = function() {
  fetchIssuesRow();
};