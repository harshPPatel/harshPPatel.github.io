var featureJSONSource="/assets/js/json/features.json";function printFeatureObject(e){for(var t=document.getElementsByClassName("--js-feature-content"),a=0;a<t.length;a++){var n='<div class="text-content"> <h2> '+e[a].heading+"</h2><p>"+e[a].paragraph+"</p></div>";t[a].innerHTML=n}}function getFeatures(){var e=new XMLHttpRequest;e.onreadystatechange=function(){4==this.readyState&&200==this.status&&printFeatureObject(JSON.parse(e.response))},e.open("GET",featureJSONSource,!0),e.send()}window.onload=getFeatures();