//locative audio
//fence around each stop
//get user's location
//check intersection between stop and location
//create layout for popup at each stop (less important)

(() => {
    // removed global variables: tourLength = 0, firstLocate = true, 

    let map, route, stops, mapCenter, currentStop = 1, active = false, played = [], 
        locationMarker, circle, parkingLots, parkingVisible = false, tourLength;
    //splash screen modal variables
    let splash = document.getElementById('splash-modal'),
        splashModal = new bootstrap.Modal(splash);
    
    // -- DISPLAYS SPLASH SCREEN --
    splashModal.show(); 

    const controller = new AbortController();

    // -- Changing content of about page --
    // add listener for splash close button
    document.querySelector(".splash-btn").addEventListener("click", (event) => {
        // when starting splash is closed, change button text for use in about menu
        // then remove event listener
        event.target.innerHTML = "Back to Tour";
        controller.abort(); // removes event listener

        // change splash title
        document.getElementById('splash-title').innerHTML = "About the Tour";

        // change splash paragraph
        document.getElementById("splash-paragraph").innerHTML = 
            "This walking tour was created by Will McAllister for Geography 572 " +
            "- Graphic Design in Cartography at the University of Wisconsin-Madison. " + 
            "It would not have been possible without the work by <i>Gareth Baldrica-Franklin</i>  " +
            "on the <a href='https://github.com/cartobaldrica/web-walking-tour'>Web Walking Tour Library</a><br><br>" +
            "The website is hosted on Github Pages and uses Leaflet JS for the majority of the interface and MapLibre GL JS " +
            "to render the vector tile basemap. The basemap itself is from Protomaps and uses OpenStreetMap data.<br><br>" +
            "(Almost) all pictures were taken by myself and all narrations were recorded by me in the DFW airport. Sound effects are from Pixabay.";
    }, {
        // ties the controller to this event
        signal: controller.signal
    });

    //add listener for the about button
    document.querySelector(".about").addEventListener("click", () => {
        splashModal.show();
    })
    //modal variables for stops
    let stop = document.getElementById('stop-modal'),
        stopModal = new bootstrap.Modal(stop);
    //add listeners for closing the stop modal
    document.querySelectorAll(".close").forEach(function(elem){
        elem.addEventListener("click", function(){
            if (elem.id == "next"){
                currentStop = currentStop + 1;
            }
            if (elem.id == "prev"){
                currentStop = currentStop - 1 < 1 ? 1 : currentStop - 1;
            }
            if (elem.id == "x"){
                currentStop = currentStop;
            }
            updateStopColor();
            updateRouteColor();
        })
    })

    //create map
    function createMap(){
        resizeMap();
       
        map = L.map("map",{
            center:L.latLng(50.5, 30.5),
            zoom:16,
            maxZoom:18,
            minZoom:12,
            bounceAtZoomLimits: false, // disables zoom bouncing at limits for mobile devices
            scrollWheelZoom: false, // disable original zoom function
            smoothWheelZoom: true,  // enable smooth zoom
            smoothSensitivity: 3   // zoom speed. default is 1
        });

        // attributing Protomaps and OSM
        map.attributionControl.addAttribution('<a href=\"https://github.com/protomaps/basemaps\">Protomaps</a> |'
            + ' <a href=\"https://openstreetmap.org\">OpenStreetMap</a>');

        // adding pmtiles vector basemap (by using maplibre for leaflet)
        var gl = L.maplibreGL({
            style: 'lib/basemap/style.json' // changed url param in json to pull pmtiles local file
        }).addTo(map);

        // required for local HTTP request to work
        let protocol = new pmtiles.Protocol({metadata: true});
            maplibregl.addProtocol("pmtiles", protocol.tile);


        //add location listenter to button
        document.querySelector(".location-button").addEventListener("click",getLocation)
        
        // add parking lot data (hidden by default)
        addParkingLots();
        
        //add stop data
        addRoute();
        addStops();
    }
    //get location function
    //location services
    function getLocation(){
        map.locate({setView:true, watch:true, enableHighAccuracy: true} );
    
        function onLocationFound(e){
            let radius = e.accuracy / 2;

            //removes marker and circle before adding a new one
            if (locationMarker){
                map.removeLayer(circle);
                map.removeLayer(locationMarker);
            }
            //adds location and accuracy information to the map
            if (e.accuracy < 90){
                circle = L.circle(e.latlng, {radius:radius, interactive:false}).addTo(map);
                locationMarker = L.marker(e.latlng,{interactive:false}).addTo(map);
                //locationMarker = L.marker(e.latlng).addTo(map).bindPopup("You are within " + Math.round(radius) + " meters of this point");
            }
            //if accuracy is less than 60m then stop calling locate function
            if (e.accuracy < 40){
                let count = 0;
                map.stopLocate();
                count++;
            }
        }
    
        map.on('locationfound', onLocationFound);

        //activate location at a regular interval
        window.setInterval( function(){
            map.locate({
                setView: false,
                enableHighAccuracy: true
                });
        }, 2500);
    }
    //add tour route to the map
    function addRoute(){
        fetch("assets/route.geojson")
            .then(result => result.json())
            .then(data => {
                route = L.geoJson(data,{
                    style:function(feature){
                        return {
                            className:"route-" + feature.properties.id,
                            weight:6
                        }
                    }
                }).addTo(map)
                updateRouteColor();
            })
    }
    //set route color
    function routeClass(props){
        let elem = document.querySelector(".route-" + props.id);
        elem.classList.remove("inactive-route")
            
        if (Number(props.id) < currentStop)
            elem.classList.add("active-route")
        else
            elem.classList.add("inactive-route")
    }
    //update route color
    function updateRouteColor(){
        route.eachLayer(function(layer){
            routeClass(layer.feature.properties)
        })
    }
    //add tour stops to map
    function addStops(){
        fetch("assets/stops.csv")
            .then(res => res.text())
            .then(data => {
                //parse csv
                data = Papa.parse(data,{
                    header:true
                }).data;
                //create geojson
                let geojson = {
                    type:"FeatureCollection",
                    name:"Sites",
                    features:[]
                }
                //populate geojson
                data.forEach(function(feature, i){
                    // once data is loaded, tour length will be set
                    tourLength = i + 1;
                    
                    //create empty object
                    let obj = {};
                    //set feature
                    obj.type = "Feature";
                    //add geometry
                    obj.geometry = {
                        type: "Point",
                        coordinates: [Number(feature.lon), Number(feature.lat)]
                    }
                    
                    //add properties
                    obj.properties = feature;
                    //add object to geojson
                    geojson.features.push(obj);
                })
                //add geojson to map
                stops = L.geoJson(geojson,{
                    pointToLayer:function(feature, latlng){
                        //set point styling
                        let options = {
                            radius:12,
                            className:"stop-" + feature.properties.id,
                            opacity:1,
                            fillOpacity:1,
                            weight:5,
                            pane:"markerPane"
                        }
                        
                        return L.circleMarker(latlng, options);
                    },
                    onEachFeature:function(feature, layer){
                        //open modal if layer is not hidden
                        layer.on('click',function(){
                            if (feature.properties.hidden != "true"){
                                openModal(feature.properties);                       
                            }
                        })
                        //center on first stop
                        if (feature.properties.id == 1){
                            let coordinates = new L.LatLng(feature.geometry.coordinates[1],feature.geometry.coordinates[0]);
                            map.setView(coordinates);
                        }
                        //add stops to stop menu
                        if (feature.properties.name){
                            let point = feature.properties.id + ". ";
                            //create new <a> element for the current stop on the tour
                            let menuStop = document.createElement("p")
                                menuStop.innerHTML = point + feature.properties.name;
                                menuStop.className = "dropdown-item";
                            //add listener to jump to stop
                            menuStop.addEventListener("click",function(){
                                //document.querySelector(".stop-menu").style.display = "none";
                                //document.querySelector(".stop-button").innerHTML = "Stops";
                                currentStop = feature.properties.id;
                                openModal(feature.properties); 
                            })
                            //create list structure
                            let listItem = document.createElement("li");
                            listItem.insertAdjacentElement("beforeend",menuStop)
                            //add element to list
                            document.querySelector(".dropdown-menu").insertAdjacentElement("beforeend",listItem)
                        }
                    }
                }).addTo(map);

                updateStopColor();
            })
    }
    //set stop color
    function stopClass(props){
        let elem = document.querySelector(".stop-" + props.id);
        elem.classList.remove("inactive-stop")
            
        if (Number(props.id) <= currentStop)
            elem.classList.add("active-stop")
        else
            elem.classList.add("inactive-stop")
    }
    //update stop style
    function updateStopColor(){
        stops.eachLayer(function(layer){
            stopClass(layer.feature.properties)
            //add popup for new stop 
            if (layer.feature.properties.id == currentStop){
                let latlng = new L.LatLng(layer.feature.geometry.coordinates[1],layer.feature.geometry.coordinates[0]);
                
                if(currentStop == 4)
                    showParkingLots();
                else if (parkingLots && currentStop != 4) 
                    hideParkingLots();

                map.flyTo(latlng);
                if (layer.feature.properties.direction){
                    var popup = L.popup()
                        .setLatLng(latlng)
                        .setContent('<p class="direction-text">'+ layer.feature.properties.direction +'</p>' 
                            + '<p class="close-direction-text">Tap map to close</p>')
                        .openOn(map);
                }
            }
        })
    }

    //open modal
    function openModal(props){        
        currentStop = Number(props.id)
        let singleImage = true;

        //clear body
        document.querySelector("#stop-body").innerHTML = "";
        document.querySelector("#title-container").innerHTML = "";
        //add title if title exists
        if (props.name){
            let title = "<h1 class='modal-title' id='stop-title'>" + props.name + "</h1>";
            document.querySelector("#title-container").insertAdjacentHTML("beforeend",title)
        }
        //add audio button if audio exists
        if (props.audio){
            let button = "<button id='play-audio'>Play Audio</button>";
            document.querySelector("#title-container").insertAdjacentHTML("beforeend",button)
            document.querySelector("#play-audio").addEventListener("click",function(){
                if (!active){
                    playAudio(props.audio)
                    document.querySelector("#play-audio").innerHTML = "Stop Audio";
                }
            })
        }

        // if stop is last stop, change 'Next' button to 'Finish'
        if(currentStop == tourLength)
            document.getElementById('next').innerHTML = "Finish";

        // add image if image exists
        // if multiple images, use '|' within data to place
        // images, captions, and text in sequence
        if(props.image && (props.image).includes("|")){
            singleImage = false;
            
            const images = (props.image).split("|");
            const captions = (props.caption).split("|");
            const text = (props.text).split("|");

            images.forEach((image, index) => {
                // add image
                document.querySelector("#stop-body")
                    .insertAdjacentHTML("beforeend", "<img src='img/" 
                        + image + "' id='stop-img'>");
                // add caption
                document.querySelector("#stop-body").insertAdjacentHTML("beforeend", 
                    "<p class='stop-caption'>" + captions[index] + "</p>");
                // add body text if it exists
                if(text[index]){
                    document.querySelector("#stop-body").insertAdjacentHTML("beforeend",
                        "<p id='stop-text'>" + text[index] + "</p>");
                }
            });
        }
        // if only one image
        else if (props.image){
            let img = "<img src='img/" + props.image + "' id='stop-img'>"
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend",img);
        }
        

        // add image caption if it exists
        if (props.caption && singleImage)
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend", 
            "<p class='stop-caption'>" + props.caption + "</p>");

        //add body text if body text exists
        if (props.text && singleImage){
            let p = "<p id='stop-text'>" + props.text + "</p>";
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend",p)
        }
        stopModal.show();
    }

    //play audio
    function playAudio(audioFile){
        active = true;
        //create audio element
        let audio = document.createElement("audio");

        let source = "<source src='audio/" + audioFile + "'>",
            play = "<p class='play'>&#9654;</p>";
        //add source 
        audio.insertAdjacentHTML("beforeend",source)
        //insert audio element into document
        document.querySelector("body").append(audio);
        document.querySelector("body").insertAdjacentHTML("beforeend",play);
        //change button on modal
        document.querySelector("#play-audio").innerHTML = "Stop Audio";
        //play audio
        audio.play().catch((e)=>{
            console.log("error")
         });
        //remove audio when finished
        audio.onended = function(){
            stopAudio();
        }
        //add listener to stop audio if modal is closed
        document.querySelectorAll(".close").forEach(function(elem){
            elem.addEventListener("click",stopAudio)
        })
        //add listener to stop audio if the stop button is pressed
        document.querySelector("#play-audio").addEventListener("click",stopAudio)
        //function to deactivate audio element and reset button
        function stopAudio(){
            //remove audio element
            audio.pause();
            audio.remove();
            //reset audio buttons
            document.querySelector("#play-audio").innerHTML = "Play Audio";               
            document.querySelector("#play-audio").removeEventListener("click",stopAudio);

            if (document.querySelector(".play"))
                document.querySelector(".play").remove();
            //set page state to inactive
            active = false; 
        }
    }

    //position the map relative to the navigation bar
    function resizeMap(){
        //get height of navigation bar and window
        let nav = document.querySelector(".navbar").offsetHeight,
            h = document.querySelector("body").offsetHeight;
        //calculate height of map based on the navigation bar and the window
        let mapHeight = h - nav;
        //set height and position  of map
        document.querySelector("#map").style.top = nav + "px";
        document.querySelector("#map").style.height = mapHeight + "px";
    }

    // add parking lots to map
    function addParkingLots(){        
        var geojsonMarkerOptions = {
            radius: 8,
            fillColor: "#ff7800",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        };

        fetch("assets/parking-lots.geojson")
            .then(result => result.json())
            .then(data => {
                parkingLots = L.geoJson(data,{
                    // style points
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, geojsonMarkerOptions);
                    },
                    // style polygons
                    style: {
                        color: '#ebae34',
                        opacity: 0.8,
                        fillOpacity: 0.8
                    }
                }).addTo(map)

                hideParkingLots(parkingLots);
            });        
    }

    function hideParkingLots(lots = parkingLots){
        if(lots){
            lots.setStyle({
                opacity: 0,
                fillOpacity: 0
            });
            parkingVisible = false;
        }
    }

    function showParkingLots(){
        if(parkingLots){
            parkingLots.setStyle({
                opacity: 0.8,
                fillOpacity: 0.8
            });
            parkingVisible = true;
        }
    }

    window.addEventListener('resize',resizeMap)

    createMap();
})();