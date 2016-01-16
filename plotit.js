var loadCount1 = 0;
var loadCount2;
var series = [];
var lasttime = moment();
var refresh = 0;
var graph;
var feed;
var channels;
var days_ago = 0;
var days_len = 0.5;
var scale_solar = 0;
var pb_key='o.daPpkzz8GM7d1FoLJGTLLcecbmmSruqD';
var websocket;

function plotit(a1, a2) {
    feed     = a1;
    channels = a2;
    if (channels.search(/temp/i) > -1) {scale_solar = 1}
    setInterval(function(){loadRefresh()}, 120000);
    date_form.days_ago.value = days_ago;
    date_form.days_len.value = days_len;
    loadLoop();
    pb_setup();
}

// Debug with http://jsfiddle.net/pushbullet/u92DA/
function pb_setup() {
    if (websocket != null) {
        websocket.close();
    }
    websocket = new WebSocket('wss://stream.pushbullet.com/websocket/' + pb_key);
    websocket.onopen = function(e) {
//      misterhouse.innerHTML = "<p>WebSocket onopen</p>";
	pb_update();
    }
    websocket.onmessage = function(e) {
	var msg = JSON.parse(e.data);
//      misterhouse.innerHTML = "<p>mt=" + msg.type + "...</p>";
	if (msg.type == 'tickle' && msg.subtype == 'push' ) {
	    pb_update();
	}
    }
    websocket.onerror = function(e) {
	misterhouse.innerHTML = "<p>WebSocket onerror</p>";
    }
    websocket.onclose = function(e) {
	misterhouse.innerHTML = "<p>WebSocket onclose</p>";
    }
}
function pb_update() {
    var xhr = new XMLHttpRequest()
    xhr.open("GET", "https://api.pushbullet.com/v2/pushes?modified_after=0&limit=2", false)
    xhr.setRequestHeader("Access-Token", pb_key)
    xhr.send()
    var msg = JSON.parse(xhr.responseText);
    misterhouse.innerHTML = "<h1 align='center' style='color:white;font-size:5.0em;font-weight:bold'>" + msg.pushes[0].body + "<\h1>";
}

function change_days (form) {
    series = [];
    loadCount1 = 0;
    lasttime = moment();
    days_len = parseInt(form.days_len.value);
    days_ago = parseInt(form.days_ago.value);
    console.log(days_len, days_ago);
    clearGraph();
    loadLoop();
}

function loadLoop() {
    loadCount2 = days_len * 4;
    var h = 24*(days_len + days_ago) - 6*loadCount1;
//  var starttime = moment().subtract(h, "hours").fromNow();
    var starttime = moment().subtract(h, "hours").startOf('hour');
    var query = { 
	datastreams: channels,
	start: starttime.toJSON(), 
        duration: '6hours',
	interval: 120, 
	limit: 1000,
    };
    console.log(days_len, days_ago, loadCount1, loadCount2, h, query);
    xively.feed.history(feed, query, loadData); 
}

function loadRefresh() {
    var stoptime  = moment();
    var starttime = lasttime;
    var query = { 
	datastreams: channels,
	start: starttime.toJSON(), 
	stop:  stoptime.toJSON(), 
	interval: 120, 
	limit: 1000,
    };
    refresh = 1;
    xively.feed.history(feed, query, loadData); 
    var t = moment().format("h:mmA");
    document.getElementById("lastupdate").innerHTML = "Updated:" + t;
}

var scale1 = d3.scale.linear().domain([40,90]).nice()
var scale2 = d3.scale.linear().domain([0,20000]).nice()

function loadData(data) {  
    var palette = new Rickshaw.Color.Palette();
    var filtedData1 = data.datastreams;

// Find channel with minimum number of datapoints ... series must have the same number of points.  zeroFill is yucky.

    for (var i1=0; i1 < filtedData1.length; i1++ ) {
	var filtedData2 = filtedData1[i1].datapoints;
	var id = filtedData1[i1].id;
	if (loadCount1 == 0) {
	    if (id == 'TempWW1') {id = 'Downstairs'}
	    if (id == 'TempWW2') {id = 'Tank1'}
	    if (id == 'TempWW3') {id = 'Tank3'}
	    if (id == 'TempWW4') {id = 'Tank2'}
	    if (id == 'TempWW5') {id = 'Tank3Bot'}

	    if (id == 'Temperature1') {id = 'Outside'}
	    if (id == 'Temperature2') {id = 'Basement'}
	    if (id == 'Temperature3') {id = 'Upstairs'}
	    if (id == '1_Power') {
		series.push({name: id, color: palette.color(), data: [], scale: scale2});
	    }
	    else {
		series.push({name: id, color: palette.color(), data: [], scale: scale1});
	    }
	}
	if (filtedData2 && filtedData2.length) {
	    for (var i2=0; i2 < filtedData2.length; i2++ ) {
		lasttime  = moment(filtedData2[i2].at);
		var date  = moment(filtedData2[i2].at).unix();
		var value = parseFloat(filtedData2[i2].value)
		if (value < 0) continue;  // Ignore bogus readings
		if (id == 'Pump') {
		    value *=  10;
		    value +=  80;
		}
		else if (id == 'Solar' && scale_solar == 1) {
		    value /= 200;
		    value +=  80;
		}
		else if (id == 'x1_Power' && scale_solar == 1) {
		    value /= 200;
		    value +=  30;
		}
		if (date) {
		    series[i1].data.push({x: date, y: value});
		}
	    }
	} 
    }	
//  console.log("refresh", refresh, loadCount1);

    if (refresh) {
	graph.update();
    }
    else if (loadCount1++ < loadCount2) {
	loadLoop();
    }
    else {
//      Rickshaw.Series.zeroFill(series);  // Will add zero values to series with missing data, otherwise plot will abort with unmatched x data.
	drawGraph(series);
    }

}

function drawGraph(data) {
//  console.log(data);
    graph = new Rickshaw.Graph( {
	element: document.getElementById("chart"),
//	element: document.querySelector("#chart"),
//	width:  2400,
//	height: 1400,
	min: 'auto',
//	min: 50,
	renderer: 'line',
//	renderer: 'scatterplot',
//	interpolation: 'linear',
//	interpolation: 'cardinal',
  	interpolation: 'basis',
	series: data
    } );
    graph.render();

//  var slider = new Rickshaw.Graph.RangeSlider.Preview({
    var slider = new Rickshaw.Graph.RangeSlider({
	graph: graph,
	element: document.getElementById('slider')
    });

    var resize = function() {
	graph.configure({
	    width:   window.innerWidth   - 200 ,
	    height:  window.innerHeight  -  50
	});
	graph.render();
	slider.build();
    }

    window.addEventListener('resize', resize); 
    resize();  // For initial window

    var hoverDetail = new Rickshaw.Graph.HoverDetail( {
	graph: graph
    } );

    var legend = new Rickshaw.Graph.Legend( {
	graph: graph,
	element: document.getElementById('legend')
    } );

    var shelving = new Rickshaw.Graph.Behavior.Series.Toggle( {
	graph: graph,
	legend: legend
    } );

    var xaxis = new Rickshaw.Graph.Axis.Time( {
	graph: graph
    });
// Bummer, this does not work
    $('.x_ticks_d3 text').css('opacity', '1.0');//fix text opacity
    $('.x_ticks_d3 .tick').css('stroke-width', '0px');//text smoothing
    $('#xaxis text').css('fill', 'white');//text color
    $('#xaxis path').css('opacity', '0');//remove line or
    $('#xaxis path').css('stroke', 'white');//change line color
    xaxis.render();

    yAxis1 = new Rickshaw.Graph.Axis.Y.Scaled({
	element: document.getElementById('yaxis1'),
	graph: graph,
	scale: scale1,
	tickFormat: Rickshaw.Fixtures.Number.formatKMBT
    });
    yAxis1.render();

    yAxis2 = new Rickshaw.Graph.Axis.Y.Scaled({
	element: document.getElementById('yaxis2'),
	graph: graph,
	grid: false,
	scale: scale2,
	tickFormat: Rickshaw.Fixtures.Number.formatKMBT
    });
    $('#yaxis2 path').css('stroke', 'white');//change line color
//    ${'#yaxis2').css('position', 'absolute');
//    ${'#yaxis2').css('left', '1250px');
//    ${'#yaxis2').css('height', '800px');
//    ${'#yaxis2').css('width', '40px');
    yAxis2.render();


//    var smoother = new Rickshaw.Graph.Smoother( {
//	graph: graph,
//// 	element: document.querySelector('#smoother')
//    } );
//    smoother.setScale(2);


}

function clearGraph() {
  $('#legend').empty();
// $('#chart_container').html('<div id="chart"></div><div id="timeline"></div><div id="slider"></div>');
  $('#chart').empty();
}
