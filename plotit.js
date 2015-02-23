var loadCount1 = 0;
var loadCount2;
var series = [];
var lasttime = moment();
var refresh = 0;
var graph;
var feed;
var channels;
var days_ago = 0;
var days_len = 1.5;
var scale_solar = 0;

function plotit(a1, a2) {
    feed     = a1;
    channels = a2;
    if (channels.search(/temp/i) > -1) {scale_solar = 1}
    setInterval(function(){loadRefresh()}, 120000);
    date_form.days_ago.value = days_ago;
    date_form.days_len.value = days_len;
    loadLoop();
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

function scale1(y) {
    return y/2;
}
var scale1 = d3.scale.linear().domain([0,1]).nice()
//var scale2 = d3.scale.linear().domain([0,.01]).nice()

function loadData(data) {  
    var palette = new Rickshaw.Color.Palette();
    var filtedData1 = data.datastreams;

// Find channel with minimum number of datapoints ... series must have the same number of points.  zeroFill is yucky.

    for (var i1=0; i1 < filtedData1.length; i1++ ) {
	var filtedData2 = filtedData1[i1].datapoints;
	var id = filtedData1[i1].id;
	if (loadCount1 == 0) {
	    if (id == 'TempWW1') {id = 'Midway'}
	    if (id == 'TempWW2') {id = 'Tank1Top'}
	    if (id == 'TempWW3') {id = 'Tank2Top'}
	    if (id == 'TempWW4') {id = 'Tank1Bottom'}
	    if (id == 'TempWW5') {id = 'Tank2Bottom'}
	    if (id == 'Temperature1') {id = 'Outside'}
	    if (id == 'Temperature2') {id = 'Downstairs'}
	    if (id == 'Temperature3') {id = 'Upstairs'}
	    var myscale = scale1;
	    series.push({name: id, color: palette.color(), data: [], scale: myscale});
	}
	if (filtedData2 && filtedData2.length) {
	    for (var i2=0; i2 < filtedData2.length; i2++ ) {
		lasttime  = moment(filtedData2[i2].at);
		var date  = moment(filtedData2[i2].at).unix();
		var value = parseFloat(filtedData2[i2].value)
		if (id == 'Pump') {
		    value *=  10;
		    value +=  80;
		}
		else if (id == 'Solar' && scale_solar == 1) {
		    value /= 200;
		    value +=  80;
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
	element: document.querySelector("#chart"),
	width:  1200,
	height:  700,
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
	    width: window.innerWidth * 0.9,
	    height: window.innerHeight * 0.8
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

    var axes = new Rickshaw.Graph.Axis.Time( {
	graph: graph
    });
    axes.render();

    var yAxis = new Rickshaw.Graph.Axis.Y({
	graph: graph,
	scale: scale1
    });
    yAxis.render();

    var smoother = new Rickshaw.Graph.Smoother( {
	graph: graph,
// 	element: document.querySelector('#smoother')
    } );
    smoother.setScale(2);

}

function clearGraph() {
  $('#legend').empty();
// $('#chart_container').html('<div id="chart"></div><div id="timeline"></div><div id="slider"></div>');
  $('#chart').empty();
}
