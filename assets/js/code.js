// var svg = d3.select("svg"),
//     width = +svg.node().getBoundingClientRect().width,
//     height = +svg.node().getBoundingClientRect().height;
var svg = d3.select("#my_dataviz")
            .append("svg"),
    width = +svg.node().getBoundingClientRect().width,
    height = +svg.node().getBoundingClientRect().height;
var tooltip = d3.select("#my_dataviz")
    .append("div")
    .attr("class", "mytooltip chartFilterPopoverContainer")
    .style("opacity", 1);
//for tooltip positions
var linkedByIndex = {};


// svg objects
var link, node, nodePoints;
// the data - an object with nodes and links
var graph;

// force simulator
var simulation = d3.forceSimulation();

// values for all forces
var forceProperties = {
    center: {
        x: 0.5,
        y: 0.5
    },
    charge: {
        enabled: true,
        strength: -30,
        distanceMin: 1,
        distanceMax: 2000
    },
    collide: {
        enabled: true,
        strength: .7,
        iterations: 1,
        radius: 5
    },
    forceX: {
        enabled: false,
        strength: .1,
        x: .5
    },
    forceY: {
        enabled: false,
        strength: .1,
        y: .5
    },
    link: {
        enabled: true,
        distance: 30,
        iterations: 1
    }
};

//Normalizition for stroke-width
var minValue = 5,
    maxValue = 0;
var sumValue = 0;
//Node story colors
var storyNumColor = ["#ff0000", "#bada55", "#407294", "#cbcba9", "#ffd700", "#ff7373", "#b4eeb4", "#f6546a", "#daa520", "#98B4D4", "#E15D44"];
var minStoryNum = 5,
    maxStoryNum = 0;
var sumStoryNum = 0;

var colorsData = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]
var customScaleLinear = d3.scaleOrdinal().domain(colorsData).range(d3.schemePaired);

// load the data
d3Data(widgetData);

function d3Data(widgetData) {
    //d3.json("miserables.json", function(error, _graph) {
    //   if (error) throw error;
    for (var i = 0; i < widgetData.nodes.length; i++) {
        widgetData.nodes[i].id = widgetData.nodes[i].docid;
        var nodesData = widgetData.nodes[i];
        sumStoryNum = sumStoryNum + nodesData.storyNum;
        if (minStoryNum > nodesData.storyNum) {
            minStoryNum = nodesData.storyNum;
        } else if (maxStoryNum < nodesData.storyNum) {
            maxStoryNum = nodesData.storyNum;
        }
    }

    for (var b = 0; b < widgetData.links.length; b++) {
        var linkData = widgetData.links[b];
        sumValue = sumValue + linkData.value;
        if (minValue > linkData.value) {
            minValue = linkData.value;
        } else if (maxValue < linkData.value) {
            maxValue = linkData.value;
        }
    }

    graph = widgetData;
    initializeDisplay();
    initializeSimulation();
    initializeEvents();
    initializeToolTip();
    
    var detectTheme = localStorage.getItem('theme');
    if (detectTheme) {
        detectTheme = JSON.parse(detectTheme);
        updateDetectTheme(detectTheme);
        $('#theameSwitch').prop('checked', detectTheme);
    }
    //});
}



//////////// FORCE SIMULATION //////////// 


// set up the simulation and event to update locations after each tick
function initializeSimulation() {
    simulation.nodes(graph.nodes);
    initializeForces();
    simulation.on("tick", ticked);
}


// add forces to the simulation
function initializeForces() {
    // add forces and associate each with a name
    simulation
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());
    // apply properties to each of the forces
    updateForces();
}

// apply new force properties
function updateForces() {
    // get each force by name and update the properties
    simulation.force("center")
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y);
    simulation.force("charge")
        .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);
    simulation.force("collide")
        .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
        .radius(forceProperties.collide.radius)
        .iterations(forceProperties.collide.iterations);
    simulation.force("forceX")
        .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
        .x(width * forceProperties.forceX.x);
    simulation.force("forceY")
        .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
        .y(height * forceProperties.forceY.y);
    simulation.force("link")
        .id(function (d) {
            return d.id;
        })
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations)
        .links(forceProperties.link.enabled ? graph.links : []);

    // updates ignored until this is run
    // restarts the simulation (important if simulation has already slowed down)
    simulation.alpha(1).restart();
}



//////////// DISPLAY ////////////

// generate the svg objects and force simulation
function initializeDisplay() {
    // set the data and properties of link lines
    link = svg.append("g")
        //.attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line");

    //link tooltip
    link.attr('class', 'link')
        .on('mouseover.tooltip', function(d) {
            tooltip.transition()
                .duration(300)
                .style("opacity", 1);
            tooltip.html(
                    '<div><b>' + d.value + ' common phrases</b></div>')
                .style("left", (d.source.x) + "px")
                .style("top", (d.source.y) + "px");
        })
        .on("mouseout.tooltip", function() {
            tooltip.transition()
                .duration(100)
                .style("opacity", 0);
        })
        .on('mouseout.fade', fade(1))
        .on("mousemove", function(d) {
            let pos = d3.select(this).node().getBoundingClientRect();
            tooltip.style("left", (d.source.x) + "px")
                .style("top", (d.source.y) + "px");
        });

    // set the data and properties of node circles
    node = svg.append("g")
        //.attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    //tooltip for node
    node.attr("class", "nodes")
                .attr('pointer-events', 'mouseover')
                .attr("fill", function(d) {
                    let num = d.levelOfConnectivity;
                    if (num === 2 ) {
                        return "#998989"; //K
                    } else if (num === 3) {
                        return "#9C7CBC"; //M
                    } else if (num === 1) {
                        return "#87E5B0"; //
                    }
                })
                .on('mouseover.tooltip', function(d) {
                    tooltip.transition()
                        .duration(300)
                        .style("opacity", 1)
                        .style('pointer-events',"all");
                    tooltip.html('<div id="tooltipInfo">'
                                    +'<div>'
                                        +'<div class="d-flex justify-content-between align-items-baseline" style="word-break: break-all;">'
                                            +'<a class="p-0" target="_blank" href="' + d.url + '">'
                                                +'<span>' + d.headline + '</span>'
                                            +'</a>'
                                            +'<button type="button" onclick="hidetooltip()" class="btn bt-sm btn-link p-0 ml-1" aria-label="Close">'
                                            +    '<span class="closeSpan" aria-hidden="true"><i class="fa fa-times" aria-hidden="true"></i></span>'
                                            +'</button>'
                                        +'</div>'
                                        +'<div><b>' + d.otherArticlesConnectedWith + '</b>'+' connections</div>'
                                        +'<div><b>' + d.storyNum + '</b>'+' storyNum</div>'
                                    +'</div>'
                                +'</div>')
                        .style("left", function() {
                            return (d.x-20) + "px";
                        })
                        .style("top", (d.y-20) + "px");
                })
                .on('mouseover.fade', fade(0.1))
                .on("mouseout.tooltip", function() {
                    // tooltip.transition()
                    //     .duration(5000)
                    //     .style("opacity", 0);
                })
                .on('mouseout.fade', fade(1))
                .on("mousemove", function(d) {
                    tooltip.style("left", function() {
                                return (d.x+10) + "px";
                        })
                        .style("top", (d.y+20) + "px");
                })
                .on("touchstart", dragstarted)
                .on("touchmove", dragged)
                .on("touchend", dragended);

   
    nodePoints = svg.selectAll("text")
        .data(graph.nodes)
        .enter().append('text')
        .attr("class", "dataPoints")
        .text(function(d) {
            return d.storyNum
        });

    // visualize the graph
    updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {
    node
        .attr("r", forceProperties.collide.radius)
        //.attr("stroke", forceProperties.charge.strength > 0 ? "blue" : "red")
        //.attr("stroke-width", forceProperties.charge.enabled == false ? 0 : Math.abs(forceProperties.charge.strength) / 15);
        .attr("fill", function(d) {
            return getRandomColor(d.storyNum);
            // let num = d.levelOfConnectivity;
            // if (num === 2 ) {
            //     return "#998989"; //K
            // } else if (num === 3) {
            //     return "#9C7CBC"; //M
            // } else if (num === 1) {
            //     return "#87E5B0"; //
            // }
        });
       
    link
        //.attr("stroke-width", forceProperties.link.enabled ? 1 : .5)
        .attr("stroke-width", function(d) {
            let normalizition = (d.value / maxValue) * 100;
            if (normalizition <= 33) {
                return "2px";
            } else if (normalizition > 33 && normalizition <= 66) {
                return "4px";
            } else if (normalizition > 66) {
                return "6px";
            }
        })
        .attr("opacity", forceProperties.link.enabled ? 1 : 0);
}

// update the display positions after each simulation tick
function ticked() {
    link
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });

    node
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        });

    nodePoints.attr('x', function(d) {
            return d.x + 7;
        })
        .attr('y', function(d) {
            return d.y;
        });

    d3.select('#alpha_value').style('flex-basis', (simulation.alpha() * 100) + '%');
}



//////////// UI EVENTS ////////////

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0.0001);
    d.fx = null;
    d.fy = null;
}

// update size-related forces
d3.select(window).on("resize", function () {
    width = +svg.node().getBoundingClientRect().width;
    height = +svg.node().getBoundingClientRect().height;
    updateForces();
});

// convenience function to update everything (run after UI input)
function updateAll() {
    updateForces();
    updateDisplay();
}


function hideNodeInfo(docid) {
    $(docid).addClass('d-none');
}

function initializeEvents() {

    // $('circle').off('mouseover').on('mouseover', function(){
    //     $(`#nodeInfo .nodeTooltip`).addClass('d-none');
    //     console.log($(this).attr('docid'));
    //     var id = $(this).attr('docid').trim();
    //     $('#'+id).removeClass('d-none');
    // })
    $('#theameSwitch').on('click', function() {
        var value =  $(this).is(':checked');
        updateDetectTheme(value);
    });
}

function updateDetectTheme(value) {
    if (value) {
        localStorage.setItem('theme',value);
        $('#theameSwitchLabel').html('<i class="fa fa-fw fa-moon-o"></i> Dark theme');
        $('body').css('background','#000000');
        $('body').css('color','#FFFFFF');
        $('.controls .force').css('background-color','rgb(98 98 98 / 61%)');
        $('div.mytooltip').css('background-color','rgb(98 98 98 / 70%)');
        $('.closeSpan').css('color','#FFFFFF !important');
        $('.dataPoints').attr('fill','#FFFFFF');
    } else {
        localStorage.setItem('theme',value);
        $('#theameSwitchLabel').html('<i class="fa fa-fw fa-sun-o"></i> Light theme');
        $('body').css('background','#FFFFFF');
        $('body').css('color','#000000');
        $('.controls .force').css('background-color','#eee');
        $('div.mytooltip').css('background-color','rgb(255 255 255 / 70%)');
        $('.closeSpan').css('color','#000000 !important');
        $('.dataPoints').attr('fill','#000000');
    }
}

//tooltip
function initializeToolTip() {
    graph.links.forEach(d => {
        linkedByIndex[`${d.source.index},${d.target.index}`] = 1;
    });    
}

function isConnected(a, b) {
    return linkedByIndex[`${a.index},${b.index}`] || linkedByIndex[`${b.index},${a.index}`] || a.index === b.index;
}

function fade(opacity) {
    return d => {
        node.style('stroke-opacity', function(o) {
            const thisOpacity = isConnected(d, o) ? 1 : opacity;
            this.setAttribute('fill-opacity', thisOpacity);
            return thisOpacity;
        });

        link.style('stroke-opacity', o => (o.source === d || o.target === d ? 1 : opacity));

    };
}

function hidetooltip() {
    $('#tooltipInfo').addClass('d-none');
    $('.mytooltip').css("opacity", 0);
}

function getRandomColor(storyNum) {
    var normalizition = (storyNum / maxStoryNum) * 100;
    // console.log('normalizition :>> ', Math.round(normalizition/10));
    var indexColor = (Math.round(normalizition/10));
    // return storyNumColor[indexColor];
    return customScaleLinear(indexColor);
    // if (storyNumColor[storyNum] === undefined) {
    //     var letters = '0123456789ABCDEF';
    //     var color = '#';
    //     for (var i = 0; i < 6; i++) {
    //         var num = Number(storyNum);
    //         color += letters[Math.floor(Math.random() * 16)];
    //     }
    //     storyNumColor[storyNum] = color;
    //     return color;
    // } else {
    //     return storyNumColor[storyNum];
    // }
}