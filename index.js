var L = require('leaflet'),
    Router = require('./router'),
    util = require('./util'),
    extent = require('turf-extent');
    gauge = require('gauge-progress')(),
    lineDistance = require('@turf/line-distance');

L.Icon.Default.imagePath = 'images/';

require('leaflet-routing-machine');

var map = L.map('map');

L.tileLayer('https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}{r}.png?access_token=pk.eyJ1IjoibGllZG1hbiIsImEiOiJjaW5odGlpM2EwMDNodnNrbDdyMXloZHRyIn0.XqcMsnzar2XNODt99aSkEA', {
        attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>"
    })
    .addTo(map);

gauge.start();
var xhr = new XMLHttpRequest();
xhr.addEventListener('progress', function(oEvent) {
    if (oEvent.lengthComputable) {
        gauge.progress(oEvent.loaded, oEvent.total);
    }
});
xhr.onload = function() {
    gauge.stop();
    if (xhr.status === 200) {
        gauge.progress(100, 100);
        setTimeout(function() {
            initialize(JSON.parse(xhr.responseText));
        });
    }
    else {
        alert('Could not load routing network :( HTTP ' + xhr.status);
    }
};
xhr.open('GET', 'network.json');
xhr.send();

function initialize(network) {
    var bbox = extent(network);
    var bounds = L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
    map.fitBounds(bounds);

    L.rectangle(bounds, {color: 'orange', weight: 1, fillOpacity: 0.03}).addTo(map);

    var router = new Router(network),
        control = L.Routing.control({
            router: router,
            routeWhileDragging: true,
            routeDragInterval: 100
        }).addTo(map);

    control.setWaypoints([
        [57.744, 12.03],
        [57.67, 11.89],
    ]);

    var totalDistance = network.features.reduce(function(total, feature) {
            if (feature.geometry.type === 'LineString') {
                return total += lineDistance(feature, 'kilometers');
            } else {
                return total;
            }
        }, 0),
        graph = router._pathFinder._compact.graph,
        nodeNames = Object.keys(graph),
        totalNodes = nodeNames.length,
        totalEdges = nodeNames.reduce(function(total, nodeName) {
            return total + Object.keys(graph[nodeName]).length;
        }, 0);

    var infoContainer = document.querySelector('#info-container');
    [
        ['Total Road Length', totalDistance, 'km'],
        ['Network Nodes', totalNodes / 1000, 'k'],
        ['Network Edges', totalEdges / 1000, 'k'],
        ['Coordinates', router._points.features.length / 1000, 'k']
    ].forEach(function(info) {
        var li = L.DomUtil.create('li', '', infoContainer);
        li.innerHTML = info[0] + ': <strong>' + Math.round(info[1]) + (info[2] ? '&nbsp;' + info[2] : '') + '</strong>';
    });
}
