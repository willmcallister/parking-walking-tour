//locative audio
//fence around each stop
//get user's location
//check intersection between stop and location
//create layout for popup at each stop (less important)

(function(){
    let map, route, stops, mapCenter, currentStop = 1, tourLength = 0, active = false, played = [],firstLocate = true, locationMarker, circle;
    //splash screen modal variables
    let splash = document.getElementById('splash-modal'),
        splashModal = new bootstrap.Modal(splash);
    splashModal.show();

    //add listener for the about button
    document.querySelector(".about").addEventListener("click",function(){
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
                currentStop = currentStop - 1 < 1 ? 1 :  currentStop - 1;
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
            minZoom:12
        });
        let url = document.querySelector("#map").dataset.basemap,
            attribution = document.querySelector("#map").dataset.attribution;

        //set basemap tileset
        let basemap = L.tileLayer(url, {
            maxZoom: 20,
            attribution: attribution
        }).addTo(map);

        //add location listenter to button
        document.querySelector(".location-button").addEventListener("click",getLocation)
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
            console.log(e.accuracy)
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
            .then(res => res.json())
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
                    //add to total length
                    if (feature.hidden == "FALSE")
                        tourLength++;
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
                    geojson.features.push(obj)
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
                                openModal(feature.properties)                            }
                        })
                        //center on first stop
                        if (feature.properties.id == 1){
                            let coordinates = new L.LatLng(feature.geometry.coordinates[1],feature.geometry.coordinates[0])
                            map.setView(coordinates)
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
                
                map.flyTo(latlng);
                if (layer.feature.properties.direction){
                    var popup = L.popup()
                        .setLatLng(latlng)
                        .setContent('<p>'+ layer.feature.properties.direction +'</p>')
                        .openOn(map);
                }
            }
        })
    }
    //open modal
    function openModal(props){
        currentStop = Number(props.id)
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
                if (active == false){
                    playAudio(props.audio)
                    document.querySelector("#play-audio").innerHTML = "Stop Audio";
                }
            })
        }
        //add image if image exists
        if (props.image){
            let img = "<img src='img/" + props.image + "' id='stop-img'>"
            document.querySelector("#stop-body").insertAdjacentHTML("beforeend",img)
        }
        //add body text if body text exists
        if (props.text){
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
            //hide modal
            stopModal.hide();
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

    window.addEventListener('resize',resizeMap)

    createMap();
})();