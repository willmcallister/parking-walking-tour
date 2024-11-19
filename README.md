# Web Walking Tour
This library provides a framework for the creation and implementation of a map-based guided tour, delivered through a browser. The library was created as a teaching tool for an advanced cartography course at the University of Wisconsin-Madison, for students with little to no programming experience, and beginner HTML/CSS skills. As such, this framework is designed to help develop graphic design skills through HTML/CSS (without touching JS). On a theoretical level, the creation of map-based guided tour allows students to explore the relationship between _maps_ and places that are _mapped_. 

For those more familiar with JavaScript, the libary can be easily adapted to new pedagogical and practical contexts. The library is built using [Leaflet](https://leafletjs.com/), [Bootstrap](https://getbootstrap.com/), and [Papa Parse](https://www.papaparse.com/). 

The library currently utilizes sample content created for a Green Stormwater Infrastructure Tour created in partnership between the UW Cartography Lab, and Wisconsin Sea Grant.

# Getting Started
Begin by downloading the zip file of the library ([main.zip](https://github.com/cartobaldrica/web-walking-tour/archive/refs/heads/main.zip)), or cloning it to your local computer.

# Structure
The __Web Walking Tour__ is structured through a single webpage interface. The tour itself is comprised of _stops_ and a _route_, both presented on a slippy map interface. Each _stop_ is a point location, while the _route_ is a linestring between each stop. When a _stop_ is selected, it opens a modal interface presenting images and text about the selected stop. 

- _index.html_: Main HTML page from which the tour is delivered.
- __assets__: Contains the two files which control the tour stops and route. 
    - _stops.csv_: This file contains information about individual stops, including the stop name, description, image, and the lat/lon of its location. (more below)
    - _route.geojson_: This file contains geographic information regarding routes between each stop.
- __img__: Contains all images shown on either the main page, or at individual tour stops
- __audio__: Contains audio files which can be linked to each tour stop.
- __css__: Contains _style.css_ which controls the style of the interface.
- __lib__: Contains external JS/CSS dependencies.
- __js__: Contains _main.js_, the file which builds tour functionality.

# Documentation

### _index.html_
_index.html_ contains two custom HTML parameters which allow you to change the tour basemap based on those in the Leaflet [provider's demo](https://leaflet-extras.github.io/leaflet-providers/preview/), or a custom UTL. Both are found within the `<div id='map'>`. 

`data-basemap`: Link to the basemap tiles. Default: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

`data-attribution`: Basemap attribution. Default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

### _stops.csv_
- _id_: The order of the stop in the tour. I.E. `1` for the first stop, `2` for the second, etc. 
- _name_: The name or title of the stop. This will appear at the top of the selected stop modal interface. 
- _audio_: The file name of an audio recording of the stop's text. Include the file type (i.e. audio.mp3). Audio recordings should be placed in the _audio_ folder.  
- _lat_: Latitude (y) of the stop location (decimal degrees).
- _lon_: Longitude (x) of the stop location (decimal degrees).
- _text_: Text content of the stop used to articulate its importance. Values in this column will be read as HTML, so you can include more complex elements and styling. 
- _direction_: Text that will appear in a popup above the stop on the map to provide user's with directions. 
- _image_: Main image that will appear below the title on the stop modal interface. Include the file type (i.e. image.png). Images should be placed in the _img_ folder.

### _route.geojson_
This geojson file contains the linestring of the tour route. Each section of the tour between two stops is a single feature. Each feature contains a single propert.
- _id_: The segment of the route on the tour. i.e. `1` for the first segment of the route.


