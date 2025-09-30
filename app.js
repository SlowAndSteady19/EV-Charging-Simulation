// API Key
const apiKey = '5b3ce3597851110001cf62482476ed8df8234464b22b5a408706f90c';

// Initialize map and layers
let map = L.map('map').setView([13.0827, 80.2707], 12);
let routeLayer = L.layerGroup().addTo(map);
let markersLayer = L.layerGroup().addTo(map);
let stationMarker;
let sourceMarker, destinationMarker;

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Ensure the map container has defined height and width
document.getElementById('map').style.height = '500px';
document.getElementById('map').style.width = '100%';

// Load EV charging stations from JSON
fetch('stations.json')
    .then(response => response.json())
    .then(data => {
        data.stations.forEach(station => {
            L.marker([station.lat, station.lon])
                .addTo(markersLayer)
                .bindPopup(`${station.name}`);
        });
    })
    .catch(error => console.error("Error fetching stations:", error));

// Create custom icons for source and destination markers
const sourceIcon = L.icon({
    iconUrl: 'source.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

const destinationIcon = L.icon({
    iconUrl: 'dest.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

// Form submit event listener
document.getElementById('ev-form').addEventListener('submit', function (e) {
    e.preventDefault();

    // Get form values
    let source = document.getElementById('source').value.split(",");
    let destination = document.getElementById('destination').value.split(",");
    let battery = parseFloat(document.getElementById('battery').value);

    // Convert string lat,lon to float
    let sourceLat = parseFloat(source[0].trim()), sourceLon = parseFloat(source[1].trim());
    let destinationLat = parseFloat(destination[0].trim()), destinationLon = parseFloat(destination[1].trim());

    // Call function to mark locations and calculate route
    markLocations([sourceLat, sourceLon], [destinationLat, destinationLon]);
    calculateRoute([sourceLat, sourceLon], [destinationLat, destinationLon], battery);
});

// Function to mark source and destination on the map
function markLocations(source, destination) {
    //markersLayer.clearLayers();

    sourceMarker = L.marker([source[0], source[1]], { icon: sourceIcon })
        .addTo(markersLayer)
        .bindPopup('Source')
        .openPopup();

    destinationMarker = L.marker([destination[0], destination[1]], { icon: destinationIcon })
        .addTo(markersLayer)
        .bindPopup('Destination')
        .openPopup();

    const bounds = L.latLngBounds([source, destination]);
    map.fitBounds(bounds, { padding: [50, 50] });
}

// Function to handle place names and coordinates and calculate the route
async function calculateRoute(sourceInput, destinationInput, battery) {
    routeLayer.clearLayers();

    try {
        let source, destination;

        if (isNaN(sourceInput[0]) || isNaN(sourceInput[1])) {
            source = await geocodePlaceName(sourceInput);
        } else {
            source = sourceInput;
        }

        if (isNaN(destinationInput[0]) || isNaN(destinationInput[1])) {
            destination = await geocodePlaceName(destinationInput);
        } else {
            destination = destinationInput;
        }

        let body = {
            coordinates: [
                [source[1], source[0]],
                [destination[1], destination[0]]
            ]
        };

        let response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error("Error fetching route data: " + response.statusText);
        }

        let data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error("No route found.");
        }

        const routeGeometry = data.routes[0].geometry;

        let routeCoordinates;
        if (typeof routeGeometry === 'string') {
            routeCoordinates = decodePolyline(routeGeometry).map(coord => [coord[0], coord[1]]);
        } else if (routeGeometry.type === 'LineString') {
            routeCoordinates = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
        } else {
            throw new Error("Unsupported geometry format.");
        }

        console.log("Route Coordinates: ", routeCoordinates);

        const routeLine = L.polyline(routeCoordinates, {
            color: '#00008B',
            weight: 10,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(routeLayer);

        L.polyline(routeCoordinates, {
            color: 'white',
            weight: 9,
            opacity: 0.8
        }).addTo(routeLayer);

        routeLine.on('mouseover', function () {
            this.setStyle({
                weight: 8,
                opacity: 1
            });
        });

        routeLine.on('mouseout', function () {
            this.setStyle({
                weight: 5,
                opacity: 1
            });
        });

        let distance = data.routes[0].summary.distance / 1000;
        let duration = data.routes[0].summary.duration / 60;
        let batteryConsumptionPerKm = 0.2;
        let batteryNeeded = distance * batteryConsumptionPerKm;

        const resultDiv = document.getElementById('result');
        if (batteryNeeded > battery) {
            findNearestStation(source[0], source[1], batteryNeeded - battery);
            resultDiv.innerHTML = `
                <p>Distance: ${distance.toFixed(2)} km</p>
                <p>Time: ${duration.toFixed(2)} minutes</p>
                <p>Battery needed: ${batteryNeeded.toFixed(2)}%. You need to charge your vehicle.</p>
            `;
        } else {
            resultDiv.innerHTML = `
                <p>Distance: ${distance.toFixed(2)} km</p>
                <p>Time: ${duration.toFixed(2)} minutes</p>
                <p>You have enough battery to reach your destination. Battery needed: ${batteryNeeded.toFixed(2)}%</p>
            `;
        }

        map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [50, 50] });

    } catch (error) {
        console.error("Error calculating route:", error);
        document.getElementById('result').innerHTML = "Failed to calculate the route. " + error.message;
    }
}

async function geocodePlaceName(placeName) {
    const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(placeName)}&key=YOUR_GEOCODE_API_KEY`;

    let response = await fetch(geocodeUrl);
    if (!response.ok) {
        throw new Error("Geocoding failed.");
    }
    
    let data = await response.json();
    if (data.results.length === 0) {
        throw new Error("Place not found.");
    }
    
    return [data.results[0].geometry.lat, data.results[0].geometry.lng];
}

function decodePolyline(polyline) {
    const coordinates = [];
    let index = 0, len = polyline.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = polyline.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = (result >> 1) ^ -(result & 1);
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = polyline.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = (result >> 1) ^ -(result & 1);
        lng += dlng;

        coordinates.push([lat / 1E5, lng / 1E5]);
    }
    return coordinates;
}

function findNearestStation(lat, lon, extraBatteryNeeded) {
    fetch('stations.json')
        .then(response => response.json())
        .then(stationsData => {
            let nearestStation = null;
            let minDistance = Infinity;

            stationsData.stations.forEach(station => {
                let dist = haversineDistance(lat, lon, station.lat, station.lon);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestStation = station;
                }
            });

            if (nearestStation) {
                if (stationMarker) {
                    map.removeLayer(stationMarker);
                }

                const chargingIcon = L.icon({
                    iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                stationMarker = L.marker([nearestStation.lat, nearestStation.lon], { icon: chargingIcon })
                    .addTo(map)
                    .bindPopup(`${nearestStation.name} at (${nearestStation.lat}, ${nearestStation.lon})`)
                    .openPopup();

                showResult(`You need to charge your vehicle. Nearest Station: ${nearestStation.name}`);
            } else {
                showResult("No charging stations found nearby.");
            }
        })
        .catch(error => {
            console.error("Error finding nearest station:", error);
            showResult("Failed to find the nearest charging station. " + error.message);
        });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showResult(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = message;
}

async function getLocationSuggestions(query) {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&size=5`);
    if (response.ok) {
        const data = await response.json();
        return data.features.map(feature => ({
            name: feature.properties.label,
            coordinates: feature.geometry.coordinates
        }));
    } else {
        console.error("Error fetching location suggestions:", response.statusText);
        return [];
    }
}

function displaySuggestions(inputElement, suggestions) {
    let dropdown = inputElement.nextElementSibling;
    if (dropdown && dropdown.classList.contains('suggestions-dropdown')) dropdown.remove();

    if (suggestions.length === 0) return;

    dropdown = document.createElement('div');
    dropdown.classList.add('suggestions-dropdown');
    inputElement.parentNode.insertBefore(dropdown, inputElement.nextSibling);

    suggestions.forEach(suggestion => {
        const option = document.createElement('div');
        option.textContent = suggestion.name;
        option.classList.add('suggestion-item');
        option.onclick = () => {
            inputElement.value = suggestion.name;
            inputElement.setAttribute('data-coordinates', JSON.stringify(suggestion.coordinates));
            dropdown.remove();
        };
        dropdown.appendChild(option);
    });
}

async function handleInputChange(event) {
    const query = event.target.value.trim();
    const inputElement = event.target;

    if (query.length > 2) {
        const suggestions = await getLocationSuggestions(query);
        displaySuggestions(inputElement, suggestions);
    } else {
        const dropdown = inputElement.nextElementSibling;
        if (dropdown && dropdown.classList.contains('suggestions-dropdown')) {
            dropdown.remove();
        }
    }
}

document.getElementById('source').addEventListener('input', handleInputChange);
document.getElementById('destination').addEventListener('input', handleInputChange);

document.addEventListener('click', (event) => {
    const dropdowns = document.querySelectorAll('.suggestions-dropdown');
    dropdowns.forEach(dropdown => {
        if (!dropdown.contains(event.target) && !dropdown.previousElementSibling.contains(event.target)) {
            dropdown.remove();
        }
    });
});

document.getElementById('ev-form').addEventListener('submit', function (e) {
    e.preventDefault();

    let sourceCoords = document.getElementById('source').getAttribute('data-coordinates');
    let destinationCoords = document.getElementById('destination').getAttribute('data-coordinates');
    let battery = parseFloat(document.getElementById('battery').value);

    sourceCoords = JSON.parse(sourceCoords);
    destinationCoords = JSON.parse(destinationCoords);

    markLocations([sourceCoords[1], sourceCoords[0]], [destinationCoords[1], destinationCoords[0]]);
    calculateRoute([sourceCoords[1], sourceCoords[0]], [destinationCoords[1], destinationCoords[0]], battery);
});
