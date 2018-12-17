const issueTable=document.querySelector("#issueTable tbody"),issueSortInputById=document.getElementById("sortIssueListById"),issueSortInputBySeverity=document.getElementById("sortIssueListBySeverity"),issueSortInputByAssignedTo=document.getElementById("sortIssueListByAssigned"),printPageIssueSortInput=document.getElementById("printPageSortForm");function getHeadingRow(){return"<tr><th> Id </th><th> Status</th><th> Description</th><th> Severity </th><th> Assigned To </th></tr>"}function createIssuesRow(e){return"<tr><td>"+e.id+"</td><td>"+e.status+"</td><td>"+e.description+"</td><td>"+e.severity+"</td><td>"+e.assignedTo+"</td></tr>"}function fetchIssuesRow(){var e=getJSONData();issueTable.innerHTML=getHeadingRow(),e.reverse().forEach(function(e){issueTable.innerHTML+=createIssuesRow(e)})}issueSortInputById.addEventListener("input",function(){issueSortInputById.value===ASCENDING&&sortAscending(ID,PRINT_PAGE),issueSortInputById.value===DESCENDING&&sortDescending(ID,PRINT_PAGE),issueSortInputById.blur(),issueSortInputBySeverity.blur(),issueSortInputByAssignedTo.blur(),issueSortInputBySeverity.value="hide",issueSortInputByAssignedTo.value="hide"}),issueSortInputBySeverity.addEventListener("input",function(){issueSortInputBySeverity.value===ASCENDING&&sortAscending(SEVERITY,PRINT_PAGE),issueSortInputBySeverity.value===DESCENDING&&sortDescending(SEVERITY,PRINT_PAGE),issueSortInputById.blur(),issueSortInputById.value="hide",issueSortInputBySeverity.blur(),issueSortInputByAssignedTo.blur(),issueSortInputByAssignedTo.value="hide"}),issueSortInputByAssignedTo.addEventListener("input",function(){issueSortInputByAssignedTo.value===ASCENDING&&sortAscending(ASSIGNED_TO,PRINT_PAGE),issueSortInputByAssignedTo.value===DESCENDING&&sortDescending(ASSIGNED_TO,PRINT_PAGE),issueSortInputById.blur(),issueSortInputById.value="hide",issueSortInputBySeverity.blur(),issueSortInputBySeverity.value="hide",issueSortInputByAssignedTo.blur()}),window.onload=function(){fetchIssuesRow()};
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