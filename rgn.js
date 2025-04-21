/*     Rede Geodesica Nacional

Aluno 1: 57418 Bruno Carmo <-- mandatory to fill
Aluno 2: 57449 Sahil Kumar <-- mandatory to fill

Comentario:

Todas as funcionalidades foram implementadas.
A informacao mostrada ao utilizador nao contem caracteres especiais por nao passa no Mooshak.

0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789

HTML DOM documentation: https://www.w3schools.com/js/js_htmldom.asp
Leaflet documentation: https://leafletjs.com/reference-1.7.1.html
*/



/* GLOBAL CONSTANTS */


const MAP_CENTRE =
	[38.661,-9.2044];  // FCT coordinates
const MAP_ID =
	"mapid";
const MAP_ATTRIBUTION =
	'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
	+ 'contributors, Imagery Â© <a href="https://www.mapbox.com/">Mapbox</a>';
const MAP_URL =
	'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token='
	+ 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
const MAP_ERROR =
	"https://upload.wikimedia.org/wikipedia/commons/e/e0/SNice.svg";
const MAP_LAYERS =
	["streets-v11", "outdoors-v11", "light-v10", "dark-v10", "satellite-v9",
		"satellite-streets-v11", "navigation-day-v1", "navigation-night-v1"]
const RESOURCES_DIR =
	"resources/";
const VG_ORDERS =
	["order1", "order2", "order3", "order4"];
const RGN_FILE_NAME =
	"rgn.xml";

/* GLOBAL VARIABLES */

let map = null;



/* USEFUL FUNCTIONS */

// Capitalize the first letter of a string.
function capitalize(str)
{
	return str.length > 0
			? str[0].toUpperCase() + str.slice(1)
			: str;
}

// Distance in km between to pairs of coordinates over the earth's surface.
// https://en.wikipedia.org/wiki/Haversine_formula
function haversine(lat1, lon1, lat2, lon2)
{
    function toRad(deg) { return deg * 3.1415926535898 / 180.0; }
    let dLat = toRad(lat2 - lat1), dLon = toRad (lon2 - lon1);
    let sa = Math.sin(dLat / 2.0), so = Math.sin(dLon / 2.0);
    let a = sa * sa + so * so * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
    return 6372.8 * 2.0 * Math.asin (Math.sqrt(a))
}

function loadXMLDoc(filename)
{
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", filename, false);
	try {
		xhttp.send();
	}
	catch(err) {
		alert("Could not access the local geocaching database via AJAX.\n"
			+ "Therefore, no POIs will be visible.\n");
	}
	return xhttp.responseXML;	
}

function getAllValuesByTagName(xml, name)  {
	return xml.getElementsByTagName(name);
}

function getFirstValueByTagName(xml, name)  {
	return getAllValuesByTagName(xml, name)[0].childNodes[0].nodeValue;
}


/* POI */
class POI { 
    constructor(xml) {
        this.name = getFirstValueByTagName(xml, "name");
        let latitude = getFirstValueByTagName(xml, "latitude");
        let longitude = getFirstValueByTagName(xml, "longitude");
		this.latlng = L.latLng(latitude, longitude);
		this.marker = L.marker(this.latlng);
    }

	
	getPOIMarker(){
		return this.marker;
	}

	getName(){
		return this.name;
	}

	getLatLng(){
		return this.latlng;
	}

}

/* VG */
class VG extends POI {
    constructor(xml) {
        super(xml);
        this.altitude = getFirstValueByTagName(xml, "altitude");
        this.type = getFirstValueByTagName(xml, "type");
		
		if(this.altitude == "ND"){
			this.marker.setLatLng(L.latLng(this.getLatLng().lat, this.getLatLng().lng, -1));	
		} else {
			this.marker.setLatLng(L.latLng(this.getLatLng().lat, this.getLatLng().lng, this.altitude));
		}
		this.marker
					.bindPopup('Eu sou o marcador do VG <b>' + this.name + '</b>.<br>'  
					  + 'O meu tipo e: <b>' + this.type + '</b>.<br>'
					  + 'A minha altitude e: <b>' + this.altitude + '</b>.<br>')
				    	.bindTooltip(this.name);
		
		this.equalOrderMarker = L.circleMarker(this.getLatLng(),
						{radius:9, color: 'red', fillColor: 'pink', fillOpacity: 0.4}
		);
		
		let circleR =  this.getAltitude() > 0? 5*this.getAltitude() : 0;
		this.heightMarker = L.circle(this.getLatLng(),
			{radius:circleR, color: 'red', fillColor: 'pink', fillOpacity: 0.4}
		); 
    }
	
	
	getAltitude() {
		return this.altitude;
	}

	getType() {
		return this.type;
	}

	getEqualOrderMarker(){
		return this.equalOrderMarker;
	}

	getHeightMarker(){
		return this.heightMarker;
	}

}

/* VG1 */
class VG1 extends VG {
	constructor(xml, icons) {
		super(xml);
        this.order = getFirstValueByTagName(xml, "order");
		let latlng = this.getLatLng();
		this.marker
					.on('popupopen', numberOfNearByVGs, this)
						.setIcon(icons['order'+ this.order])
							.getPopup().setContent(this.marker.getPopup().getContent()
						  	  + 'A minha ordem e <b>'+ this.order + '</b>.<br>'
						  	  + 'Numero de vgs proximas' + '<b><SPAN id="nearByVgs"> </SPAN></b><br>'
						  	  + '<INPUT TYPE="button" class="button buttonP" VALUE="Marcar Igual Ordem" ONCLICK="markEqualOrder(1)"></INPUT>'
						  	  + '<INPUT TYPE="button" class="button buttonP" VALUE="Street View" ONCLICK= "gmStreetView(' 
						  	  + latlng.lat + ',' + latlng.lng + ')"></INPUT><br>');
	}

	
	getOrder(){
		return this.order;
	}

}

/* VG2 */
class VG2 extends VG {
    constructor(xml, icons) {
        super(xml);
        this.order = getFirstValueByTagName(xml, "order");
		let latlng = this.getLatLng();
		this.marker
					.setIcon(icons['order'+ this.order])
						.getPopup().setContent(this.marker.getPopup().getContent()
						  + 'A minha ordem e <b>'+ this.order + '</b>.<br>'
						  + '<INPUT TYPE="button" class="button buttonP" VALUE="Marcar Igual Ordem" ONCLICK="markEqualOrder(2)"></INPUT>'
						  + '<INPUT TYPE="button" class="button buttonP" VALUE="Street View" ONCLICK= "gmStreetView(' 
						  + latlng.lat + ',' + latlng.lng + ')"></INPUT><br>'
						  +'<INPUT TYPE="button" class="button buttonP" VALUE="Marcar VGs Proximos" ONCLICK="markNearBy('
						  + latlng.lat + ',' + latlng.lng +  ',' + 30 + ')"></INPUT><br>');
	}	
	
	
	getOrder(){
		return this.order;
	}

}

/* VG3 */
class VG3 extends VG {
    constructor(xml, icons) {	
        super(xml);
        this.order = getFirstValueByTagName(xml, "order");
		let latlng = this.getLatLng();
		this.marker
					.setIcon(icons['order'+ this.order])
						.getPopup().setContent(this.marker.getPopup().getContent()
						  + 'A minha ordem e <b>' + this.order + '</b>.<br>'
						  + '<INPUT TYPE="button" class="button buttonP" VALUE="Marcar Igual Ordem" ONCLICK="markEqualOrder(3)"></INPUT>'
						  + '<INPUT TYPE="button" class="button buttonP" VALUE="Street View" ONCLICK= "gmStreetView(' 
						  + latlng.lat + ',' + latlng.lng +')"></INPUT><br>');
	}
	
	getOrder(){
		return this.order;
	}

}

/* VG4 */
class VG4 extends VG {
    constructor(xml, icons) {
        super(xml);
        this.order = getFirstValueByTagName(xml, "order");
		let latlng = this.getLatLng();
		this.marker
					.setIcon(icons['order'+ this.order])
						.getPopup().setContent(this.marker.getPopup().getContent()
						  + 'A minha ordem e <b>' + this.order + '</b>.<br> '
						  + '<INPUT TYPE="button" class="button buttonP" VALUE="Mark Equal Order" ONCLICK="markEqualOrder(4)"></INPUT>'
						  + '<INPUT TYPE="button" class="button buttonP" VALUE="Street View" ONCLICK= "gmStreetView(' 
						  + latlng.lat + ',' + latlng.lng + ')"></INPUT><br>');
	}
	
	getOrder(){
		return this.order;
	}

}


/* MAP */

class Map {
	constructor(center, zoom) {
		this.lmap = L.map(MAP_ID).setView(center, zoom);
		this.addBaseLayers(MAP_LAYERS);
		let icons = this.loadIcons(RESOURCES_DIR);
		
		this.vgCluster = L.markerClusterGroup();
		
		this.equalOrderMarkerC = L.markerClusterGroup();
		this.equalOrderMarkerC.addTo(this.lmap);
		
		this.heightMarkerCluster = L.markerClusterGroup();
		this.heightMarkerCluster.addTo(this.lmap);

		this.nearByMarkerC = L.markerClusterGroup();

		this.vgLayerGroups = this.makeLayerGroups(VG_ORDERS.length);
		this.equalOrderMarkerLGs = this.makeLayerGroups(VG_ORDERS.length);
		this.heightMarkerLGs = this.makeLayerGroups(VG_ORDERS.length);

		this.vgGroups = {
			order1: [],
			order2: [],
			order3: [],
			order4: []
		};

		this.loadRGN(this.vgLayerGroups, this.vgGroups, this.equalOrderMarkerLGs, this.heightMarkerLGs, RESOURCES_DIR + RGN_FILE_NAME, icons);		
		
		this.populateClusterGroup(this.vgCluster, this.vgLayerGroups);
		this.populateMap(this.vgCluster);
		
		this.addClickHandler(e =>
			L.popup()
			.setLatLng(e.latlng)
			.setContent("Voce clicou no mapa em " + e.latlng.toString())
		);
		this.removeLayersOnClick();
	}


	makeMapLayer(name, spec) {
		let urlTemplate = MAP_URL;
		let attr = MAP_ATTRIBUTION;
		let errorTileUrl = MAP_ERROR;
		let layer =
			L.tileLayer(urlTemplate, {
					minZoom: 6,
					maxZoom: 19,
					errorTileUrl: errorTileUrl,
					id: spec,
					tileSize: 512,
					zoomOffset: -1,
					attribution: attr
			});
		return layer;
	}

	addBaseLayers(specs) {
		let baseMaps = [];
		for(let i in specs)
			baseMaps[capitalize(specs[i])] =
				this.makeMapLayer(specs[i], "mapbox/" + specs[i]);
		baseMaps[capitalize(specs[0])].addTo(this.lmap);
		L.control.scale({maxWidth: 150, metric: true, imperial: false})
									.setPosition("topleft").addTo(this.lmap);
		L.control.layers(baseMaps, {}).setPosition("topleft").addTo(this.lmap);
		return baseMaps;
	}

	loadIcons(dir) {
		let icons = [];
		let iconOptions = {
			iconUrl: "??",
			shadowUrl: "??",
			iconSize: [16, 16],
			shadowSize: [16, 16],
			iconAnchor: [8, 8],
			shadowAnchor: [8, 8],
			popupAnchor: [0, -6] // offset the determines where the popup should open
		};
		for(let i = 0 ; i < VG_ORDERS.length ; i++) {
			iconOptions.iconUrl = dir + VG_ORDERS[i] + ".png";
		    icons[VG_ORDERS[i]] = L.icon(iconOptions);
		}
		return icons;
	}

	makeLayerGroups(size){
		let layerGroups = [];
		for(let i = 0; i < size; i++){
			layerGroups[i] = L.layerGroup();
		}
		return layerGroups;
	}

	makeVGForMap(vgLayerGroups, vgGroups, equalOrderMarkerLGs, heightMarkerLGs, xml, icons, order){
		let vg = null;
		switch(order){
			case 1:
				vg = new VG1(xml, icons);
				break;
			case 2:
				vg = new VG2(xml, icons);
				break;
			case 3:
				vg = new VG3(xml, icons);
				break;
			case 4:
				vg = new VG4(xml, icons);
				break;
		}
		vgLayerGroups[order - 1].addLayer(vg.getPOIMarker());
		vgGroups["order" + order].push(vg);
		equalOrderMarkerLGs[order - 1].addLayer(vg.getEqualOrderMarker());		
		heightMarkerLGs[order - 1].addLayer(vg.getHeightMarker());
	}

	makePOIForMap(poiType, poiLayerGroups, poiGroups, equalOrderMarkerLGs, heightMarkerLGs, xml, icons, order){
		if(poiType === "vg"){
			this.makeVGForMap(poiLayerGroups, poiGroups, equalOrderMarkerLGs, heightMarkerLGs, xml, icons, order);
		}
	}

	loadRGN(poiLayerGroups, poiGroups, equalOrderMarkerLGs, heightMarkerLGs, filename, icons) {
		let xmlDoc = loadXMLDoc(filename);
		let xs = getAllValuesByTagName(xmlDoc, "vg"); 
		let order = 0;
		let vg = null;
		if(xs.length == 0)
			alert("Empty file");
		else {
			for(let i = 0 ; i < xs.length ; i++){
				order = parseInt(getFirstValueByTagName(xs[i], "order"))
				this.makePOIForMap("vg", poiLayerGroups, poiGroups, equalOrderMarkerLGs, heightMarkerLGs, xs[i], icons, order);
			}
		}	
		return this.vgLayerGroup;
	}

	populateClusterGroup(clusterGroup, layers)  {
		for(let i = 0 ; i < layers.length ; i++){
			clusterGroup.addLayer(layers[i]);
		}
	}

	populateMap(layer){
		layer.addTo(this.lmap);
	}

	addClickHandler(handler) {
		let m = this.lmap;
		function handler2(e) {
			return handler(e).openOn(m);
		}
		return this.lmap.on('click', handler2);
	}

	removeLayersOnClick(){
		function removeLayers(e){
			for(let i = 0; i < VG_ORDERS.length; i++){
				if(this.hasEqualOrderMarkerLG(i+1))
					this.equalOrderMarkerC.removeLayer(this.equalOrderMarkerLGs[i]);
				if(this.hasHeightMarkerLG(i+1))
					this.heightMarkerCluster.removeLayer(this.heightMarkerLGs[i]);
			}
			let circles = this.nearByMarkerC.getLayers();
			for(let i = 0; i < circles.length; i++){
				this.nearByMarkerC.removeLayer(circles[i]);
			}		
		}
		this.lmap.on('click', removeLayers, this);
	}
	
	addCircle(pos, radius, popup) {
		let circle =
			L.circle(pos,
				radius,
				{color: 'red', fillColor: 'pink', fillOpacity: 0.4}
			);
		circle.addTo(this.lmap);
		if( popup != "" )
			circle.bindPopup(popup);
		return circle;
	}

	addLayerGroup(groupOrder){
		this.vgCluster.addLayer(this.vgLayerGroups[groupOrder-1]);
	}
	
	removeLayerGroup(groupOrder){
		this.vgCluster.removeLayer(this.vgLayerGroups[groupOrder-1]);
	}

	hasLayerGroup(groupOrder){
		let marker = this.vgLayerGroups[groupOrder-1].getLayers()[0]; 
		return this.vgCluster.hasLayer(marker);
	}

	getNumberOfLayersInLayerGroup(groupOrder){
		return this.vgLayerGroups[groupOrder-1].getLayers().length;
	}

	markEqualOrderVGs(order){
		this.equalOrderMarkerLGs[order-1].setZIndex(400);
		this.equalOrderMarkerC.addLayer(this.equalOrderMarkerLGs[order-1]);	
	}

	removeEqualOrderVGs(order){
		this.equalOrderMarkerC.removeLayer(this.equalOrderMarkerLGs[order-1]);
	}

	hasEqualOrderMarkerLG(groupOrder){
		let marker = this.equalOrderMarkerLGs[groupOrder-1].getLayers()[0];
		return this.equalOrderMarkerC.hasLayer(marker);
	}

	addHeightMarkerLG(groupOrder){
		this.heightMarkerLGs[groupOrder-1].setZIndex(400);
		this.heightMarkerCluster.addLayer(this.heightMarkerLGs[groupOrder-1]);
	}

	removeHeightMarkerLG(groupOrder){
		this.heightMarkerCluster.removeLayer(this.heightMarkerLGs[groupOrder-1]);
	}

	hasHeightMarkerLG(groupOrder){
		let heightMarker = this.heightMarkerLGs[groupOrder-1].getLayers()[0];
		return this.heightMarkerCluster.hasLayer(heightMarker);
	}

	numberNearByVGsFrom(vg, radius){
		let activeVGs = this.vgCluster.getLayers();
		let n = 0;
		let tmpVG = null;
		let distance = 0;
		for(let i = 0; i < activeVGs.length; i++){
			tmpVG = activeVGs[i];
			distance = haversine(vg.getLatLng().lat, vg.getLatLng().lng, tmpVG.getLatLng().lat, tmpVG.getLatLng().lng);
			if(distance <= radius){
				n++;
			}
		}
		return n-1;		
	}

	markNearByFrom(lat, lng, radius){
		let activeVGs = this.vgCluster.getLayers();
		let tmpVG = null;
		let tmpVGLatLng = null;
		let distance = 0;
		
		let circle = null;
		for(let i = 0; i < activeVGs.length; i++){
			tmpVG = activeVGs[i];
			tmpVGLatLng = tmpVG.getLatLng();
			distance = haversine(lat, lng, tmpVGLatLng.lat, tmpVGLatLng.lng);
			if(distance <= radius){
				circle = L.circle(tmpVGLatLng,
					{radius:77, color: 'red', fillColor: 'pink', fillOpacity: 0.4});
				this.nearByMarkerC.addLayer(circle);
			}
		}
		this.nearByMarkerC.setZIndex(400);
		this.nearByMarkerC.addTo(this.lmap);
	}

	getHeighestLowestPOIMarkers(){
		let activeVGMarkers = this.vgCluster.getLayers();	
		let	heighestPOIMarker = null;
		let	lowestPOIMarker = null;
		let	vg = null;
		let	i = 0;
		
		if(activeVGMarkers.length === 0){
			return null;
		}
		for( ; i < activeVGMarkers.length; i++){
			vg = activeVGMarkers[i];
			if(vg.getLatLng().alt != -1){
				heighestPOIMarker = vg;
				lowestPOIMarker = vg;
				i++;
				break;
			}
		}
		for( ; i < activeVGMarkers.length; i++){
			vg = activeVGMarkers[i];
			if(vg.getLatLng().alt != -1){
				if(vg.getLatLng().alt > heighestPOIMarker.getLatLng().alt){
					heighestPOIMarker = vg;
				}
				if(vg.getLatLng().alt < lowestPOIMarker.getLatLng().alt){
					lowestPOIMarker = vg;
				}
			}
		}
		return [heighestPOIMarker, lowestPOIMarker];
	}

	getHighestLowestPOI(){
		let highLowPOIMarkers = this.getHeighestLowestPOIMarkers();
		if(highLowPOIMarkers == null){
			return null;
		}

		let activeVGs = [];
		if(this.hasLayerGroup(1)){
			activeVGs = activeVGs.concat(this.vgGroups["order1"]);
		}
		if(this.hasLayerGroup(2)){
			activeVGs = activeVGs.concat(this.vgGroups["order2"]);
		}
		if(this.hasLayerGroup(3)){
			activeVGs = activeVGs.concat(this.vgGroups["order3"]);
		}
		if(this.hasLayerGroup(4)){
			activeVGs = activeVGs.concat(this.vgGroups["order4"]);
		}
		
		let highLowPOI = ["none", "none"];		
		let highPOIMarker = highLowPOIMarkers[0];
		let lowPOIMarker = highLowPOIMarkers[1];

		for(let i = 0; i < activeVGs.length; i++){
			if(highLowPOI[0] === "none"){
				if(highPOIMarker.getLatLng().equals(activeVGs[i].getLatLng())){
					highLowPOI[0] = activeVGs[i];
				}
			}
			if(highLowPOI[1] === "none"){
				if(lowPOIMarker.getLatLng().equals(activeVGs[i].getLatLng())){
					highLowPOI[1] = activeVGs[i];
				}
			}
			if(highLowPOI[0] !== "none" && highLowPOI[1] !== "none"){
				break;
			}
		}
		return highLowPOI;
	}	

	checkVGs(order, inf, sup){
		let vgGroup = this.vgGroups["order" + order];
		let regulars = [];
		let irregulars = [];
		let distance = 0;
		let valid = false;
		let vg1 = null;
		let vg2 = null;

		for(let i = 0; i < vgGroup.length-1; i++){
			vg1 = vgGroup[i];
			for(let j = i+1; j < vgGroup.length && !valid; j++){
				vg2 = vgGroup[j];
				distance = haversine(vg1.getLatLng().lat, vg1.getLatLng().lng, vg2.getLatLng().lat, vg2.getLatLng().lng);
				if(distance >= inf && distance <= sup){
					valid = true;
					if(!regulars.includes(i)){
						regulars.push(i)
					}
					if(!regulars.includes(j)){
						regulars.push(j)
					}
				} 
			}
			valid = false;	
		}
		
		irregulars = vgGroup.filter((elm, i) => !regulars.includes(i));

		return irregulars;
	}
	
}

/* FUNCTIONS for HTML */

function onLoad()
{
	map = new Map(MAP_CENTRE, 12);
	map.addCircle(MAP_CENTRE, 100, "FCT/UNL");
	updateStats();
}

/* FUNCTION 1 */
function checkboxUpdate(checkbox) {
	let checkId = checkbox.id;
	if(checkbox.checked ){
		map.addLayerGroup(checkId);
	}
	else{
		map.removeLayerGroup(checkId);
		map.removeEqualOrderVGs(checkId);
		map.removeHeightMarkerLG(checkId)
	}
	updateStats();
}


/* FUNCTION 2 */
function updateStats() {
	let nVGs = document.getElementById('visible_caches');
	let nVGs1 = document.getElementById('visible_o1_caches');
	let nVGs2 = document.getElementById('visible_02_caches');
	let nVGs3 = document.getElementById('visible_03_caches');
	let nVGs4 = document.getElementById('visible_04_caches');

	let highestVGName = document.getElementById('highest_vg_name');
	let highestVGAltitude = document.getElementById('highest_vg_altitude');
	let lowestVGName = document.getElementById('lowest_vg_name');
	let lowestVGAltitude = document.getElementById('lowest_vg_altitude');

	let totalVG1 = 0;
	let totalVG2 = 0;
	let totalVG3 = 0;
	let totalVG4 = 0;

	let highLowVG = map.getHighestLowestPOI();
	
	if(map.hasLayerGroup(1)){
		totalVG1 = map.getNumberOfLayersInLayerGroup(1);
	}
	if(map.hasLayerGroup(2)){
		totalVG2 = map.getNumberOfLayersInLayerGroup(2);
	}
	if(map.hasLayerGroup(3)){
		totalVG3 = map.getNumberOfLayersInLayerGroup(3);
	}
	if(map.hasLayerGroup(4)){
		totalVG4 = map.getNumberOfLayersInLayerGroup(4);
	}
	
	nVGs.innerHTML = totalVG1 + totalVG2 + totalVG3 + totalVG4;
	nVGs1.innerHTML = totalVG1;
	nVGs2.innerHTML = totalVG2;
	nVGs3.innerHTML = totalVG3;
	nVGs4.innerHTML = totalVG4;
	
	if(highLowVG == null){
		highestVGName.innerHTML = "None";
		highestVGAltitude.innerHTML = "Unavailable";
		lowestVGName.innerHTML = "None";
		lowestVGAltitude.innerHTML = "Unavailable";	
	} else{
		highestVGName.innerHTML = highLowVG[0].getName();
		highestVGAltitude.innerHTML = highLowVG[0].getAltitude();
		lowestVGName.innerHTML = highLowVG[1].getName();
		lowestVGAltitude.innerHTML = highLowVG[1].getAltitude();
	} 
}

/* FUNCTION 4 */
function checkAllVG() {
	let irregulars = [];
	let msg = "";

	if(map.hasLayerGroup(1)){
		irregulars = irregulars.concat(map.checkVGs(1, 30, 60));
	}
	if(map.hasLayerGroup(2)){
		irregulars = irregulars.concat(map.checkVGs(2, 20, 30));
	}
	if(map.hasLayerGroup(3)){
		irregulars = irregulars.concat(map.checkVGs(3, 5, 10));
	}

	if(irregulars.length != 0) {
		msg = "Vertices geodesicos invalidos: \n"
		for(let i = 0; i < irregulars.length; i++){
			vg = irregulars[i];
			msg = msg + (i+1) + ".  nome: " + vg.getName() + " tipo: " + vg.getType() + " ordem: "+ vg.getOrder() + "\n";
		}
	} else{
		msg = "Nao existem vertices geodesicos invalidos!"
	}
	alert(msg);
}

/* FUNCTION 5 */
function viewVGHeight(){
	if(map.hasLayerGroup(1)){
		map.addHeightMarkerLG(1);
	}
	if(map.hasLayerGroup(2)){
		map.addHeightMarkerLG(2);
	}
	if(map.hasLayerGroup(3)){
		map.addHeightMarkerLG(3);
	}
	if(map.hasLayerGroup(4)){
		map.addHeightMarkerLG(4);
	}
}

/* FUNCTION 6 */
function markEqualOrder(vgOrder) {
	map.markEqualOrderVGs(vgOrder);
}

/* FUNCTION 7 */
function gmStreetView(lat, lng) {
	document.location = 'https://www.google.com/maps?layer=c&cbll=' + lat + "," + lng;
}

/* FUNCTION 9 */
function numberOfNearByVGs(e) {
	let n = map.numberNearByVGsFrom(this.getPOIMarker(), 60);
	let popup = this.getPOIMarker().getPopup();
	let nVgs = popup.getElement().getElementsByTagName('span')[0];

	nVgs.innerHTML = ": " + n;	
}

/* FUNCTION 10 */
function markNearBy(lat, lng, radius) {
	map.markNearByFrom(lat, lng, radius);
}
