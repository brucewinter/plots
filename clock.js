function startTime() {
  var t = moment().format("h:mm:ss");
  document.getElementById("clock").innerHTML = t;
  t=setTimeout('startTime()', 500)
}

window.onload=startTime;
