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
                .addTo(map)
                .bindPopup(`${station.name}`);
        });
    })
    .catch(error => console.error("Error fetching stations:", error));

// Create custom icons for source and destination markers
const sourceIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41]
});

const destinationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41]
});

// Function to mark source and destination on the map
function markLocations(source, destination) {
    // Clear previous markers
    markersLayer.clearLayers();

    // Add markers for source and destination
    sourceMarker = L.marker([source[0], source[1]], { icon: sourceIcon })
        .addTo(markersLayer)
        .bindPopup('Source')
        .openPopup();

    destinationMarker = L.marker([destination[0], destination[1]], { icon: destinationIcon })
        .addTo(markersLayer)
        .bindPopup('Destination');

    // Adjust the map view to show both markers
    const bounds = L.latLngBounds([source, destination]);
    map.fitBounds(bounds, { padding: [50, 50] });
}

// Function to calculate route
async function calculateRoute(source, destination, battery) {
    routeLayer.clearLayers();

    try {
        // Prepare the request body with [lon, lat] format for OpenRouteService
        let body = {
            coordinates: [
                [source[1], source[0]], // [lon, lat]
                [destination[1], destination[0]] // [lon, lat]
            ]
        };

        console.log("Requesting route for:", body);

        // Fetch route data from OpenRouteService API
        let response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error("Error fetching route data: " + response.statusText + " - " + errorText);
        }

        let data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error("No route found.");
        }

        // Extract route geometry
        const routeGeometry = data.routes[0].geometry;
        let routeCoordinates;

        console.log("Geometry type:", typeof routeGeometry);
        console.log("Geometry data:", routeGeometry);

        if (typeof routeGeometry === 'string') {
            // Encoded polyline string
            routeCoordinates = decodePolyline(routeGeometry);
        } else if (routeGeometry && routeGeometry.type === 'LineString') {
            // GeoJSON LineString: coordinates are [lon, lat], need to swap to [lat, lon]
            routeCoordinates = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
        } else if (routeGeometry && routeGeometry.coordinates) {
            // Try to extract coordinates directly
            routeCoordinates = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
        } else if (Array.isArray(routeGeometry)) {
            // Direct array of coordinates
            routeCoordinates = routeGeometry.map(coord => [coord[1], coord[0]]);
        } else {
            console.error("Full API response:", JSON.stringify(data, null, 2));
            throw new Error("Unsupported geometry format. Check console for details.");
        }

        // Draw the route on the map
        const routeLine = L.polyline(routeCoordinates, {
            color: '#4285F4',
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(routeLayer);

        // Add outline for better visibility
        L.polyline(routeCoordinates, {
            color: '#1a73e8',
            weight: 8,
            opacity: 0.4
        }).addTo(routeLayer);

        // Calculate distance, time, and battery consumption
        let distance = data.routes[0].summary.distance / 1000; // km
        let duration = data.routes[0].summary.duration / 60; // minutes
        let batteryConsumptionPerKm = 0.2; // 0.2% per km
        let batteryNeeded = distance * batteryConsumptionPerKm;

        // Show the results
        const resultDiv = document.getElementById('result');
        if (batteryNeeded > battery) {
            findNearestStation(source[0], source[1], batteryNeeded - battery);
            resultDiv.innerHTML = `
                <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
                <p><strong>Time:</strong> ${duration.toFixed(0)} minutes</p>
                <p><strong>Battery needed:</strong> ${batteryNeeded.toFixed(1)}%</p>
                <p style="color: #f44336;"><strong>⚠ Warning:</strong> You need to charge your vehicle!</p>
            `;
        } else {
            resultDiv.innerHTML = `
                <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
                <p><strong>Time:</strong> ${duration.toFixed(0)} minutes</p>
                <p><strong>Battery needed:</strong> ${batteryNeeded.toFixed(1)}%</p>
                <p style="color: #4caf50;">✓ You have enough battery (${battery}%) to reach your destination.</p>
            `;
        }

        map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [50, 50] });

    } catch (error) {
        console.error("Error calculating route:", error);
        document.getElementById('result').innerHTML = `<p style="color: #f44336;">Failed to calculate route: ${error.message}</p>`;
    }
}

// Find nearest charging station
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
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    shadowSize: [41, 41]
                });

                stationMarker = L.marker([nearestStation.lat, nearestStation.lon], { icon: chargingIcon })
                    .addTo(map)
                    .bindPopup(`<strong>Nearest Charging Station</strong><br>${nearestStation.name}<br>Distance: ${minDistance.toFixed(2)} km`)
                    .openPopup();

                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML += `<p><strong>Nearest Station:</strong> ${nearestStation.name} (${minDistance.toFixed(2)} km away)</p>`;
            }
        })
        .catch(error => console.error("Error finding nearest station:", error));
}

// Function to decode polyline string
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

        coordinates.push([lat / 1E5, lng / 1E5]); // [lat, lon]
    }
    return coordinates;
}

// Haversine distance calculation
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get location suggestions using OpenRouteService Geocoding API
async function getLocationSuggestions(query) {
    try {
        const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&size=5`);
        if (response.ok) {
            const data = await response.json();
            return data.features.map(feature => ({
                name: feature.properties.label,
                coordinates: feature.geometry.coordinates // [lon, lat]
            }));
        } else {
            console.error("Error fetching location suggestions:", response.statusText);
            return [];
        }
    } catch (error) {
        console.error("Error in getLocationSuggestions:", error);
        return [];
    }
}

// Display suggestions dropdown
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

// Handle input changes
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

// Attach event listeners
document.getElementById('source').addEventListener('input', handleInputChange);
document.getElementById('destination').addEventListener('input', handleInputChange);

// Hide suggestions when clicking outside
document.addEventListener('click', (event) => {
    const dropdowns = document.querySelectorAll('.suggestions-dropdown');
    dropdowns.forEach(dropdown => {
        if (!dropdown.contains(event.target) && !dropdown.previousElementSibling.contains(event.target)) {
            dropdown.remove();
        }
    });
});

// Form submit handler - SINGLE EVENT LISTENER
document.getElementById('ev-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    try {
        // Get input values
        const sourceInput = document.getElementById('source').value.trim();
        const destinationInput = document.getElementById('destination').value.trim();
        const battery = parseFloat(document.getElementById('battery').value);

        // Validate battery input
        if (isNaN(battery) || battery < 0 || battery > 100) {
            alert('Please enter a valid battery percentage (0-100)');
            return;
        }

        let sourceCoords, destinationCoords;

        // Check if coordinates are stored from autocomplete
        const storedSourceCoords = document.getElementById('source').getAttribute('data-coordinates');
        const storedDestCoords = document.getElementById('destination').getAttribute('data-coordinates');

        if (storedSourceCoords) {
            // Use stored coordinates from autocomplete (format: [lon, lat])
            sourceCoords = JSON.parse(storedSourceCoords);
            sourceCoords = [sourceCoords[1], sourceCoords[0]]; // Convert to [lat, lon]
        } else if (sourceInput.includes(',')) {
            // Parse manual lat,lon input
            const parts = sourceInput.split(',');
            sourceCoords = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
        } else {
            alert('Please select a location from the suggestions or enter coordinates as: latitude,longitude');
            return;
        }

        if (storedDestCoords) {
            destinationCoords = JSON.parse(storedDestCoords);
            destinationCoords = [destinationCoords[1], destinationCoords[0]]; // Convert to [lat, lon]
        } else if (destinationInput.includes(',')) {
            const parts = destinationInput.split(',');
            destinationCoords = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
        } else {
            alert('Please select a location from the suggestions or enter coordinates as: latitude,longitude');
            return;
        }

        // Validate coordinates
        if (isNaN(sourceCoords[0]) || isNaN(sourceCoords[1]) || 
            isNaN(destinationCoords[0]) || isNaN(destinationCoords[1])) {
            alert('Invalid coordinates. Please check your input.');
            return;
        }

        console.log("Source coords:", sourceCoords);
        console.log("Destination coords:", destinationCoords);

        // Mark locations and calculate route
        markLocations(sourceCoords, destinationCoords);
        await calculateRoute(sourceCoords, destinationCoords, battery);

    } catch (error) {
        console.error("Error in form submission:", error);
        document.getElementById('result').innerHTML = `<p style="color: #f44336;">Error: ${error.message}</p>`;
    }
});

// // API Key
// const apiKey = '5b3ce3597851110001cf62482476ed8df8234464b22b5a408706f90c';

// // Initialize map and layers
// let map = L.map('map').setView([13.0827, 80.2707], 12);
// let routeLayer = L.layerGroup().addTo(map); // Layer to hold the route
// let markersLayer = L.layerGroup().addTo(map); // Layer to hold the source and destination markers
// let stationMarker; // To hold the nearest station marker
// let sourceMarker, destinationMarker; // Declare variables for source and destination markers

// // Add OpenStreetMap tile layer
// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '© OpenStreetMap contributors',
//     maxZoom: 19
// }).addTo(map);

// // Ensure the map container has defined height and width
// document.getElementById('map').style.height = '500px';
// document.getElementById('map').style.width = '100%';

// // Load EV charging stations from JSON
// fetch('stations.json')
//     .then(response => response.json())
//     .then(data => {
//         data.stations.forEach(station => {
//             L.marker([station.lat, station.lon])
//                 .addTo(markersLayer)
//                 .bindPopup(`${station.name}`);
//         });
//     })
//     .catch(error => console.error("Error fetching stations:", error));

// // Create custom icons for source and destination markers
// const sourceIcon = L.icon({
//     iconUrl: 'source.png', // Ensure this path is correct or use an external URL for testing
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34]
// });

// const destinationIcon = L.icon({
//     iconUrl: 'dest.png', // Ensure this path is correct or use an external URL for testing
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34]
// });

// // Form submit event listener
// document.getElementById('ev-form').addEventListener('submit', function (e) {
//     e.preventDefault();

//     // Get form values
//     let source = document.getElementById('source').value.split(",");
//     let destination = document.getElementById('destination').value.split(",");
//     let battery = parseFloat(document.getElementById('battery').value);

//     // Validate input


//     // Convert string lat,lon to float
//     let sourceLat = parseFloat(source[0].trim()), sourceLon = parseFloat(source[1].trim());
//     let destinationLat = parseFloat(destination[0].trim()), destinationLon = parseFloat(destination[1].trim());


//     // Call function to mark locations and calculate route
//     markLocations([sourceLat, sourceLon], [destinationLat, destinationLon]);
//     calculateRoute([sourceLat, sourceLon], [destinationLat, destinationLon], battery);
// });

// // Function to mark source and destination on the map
// function markLocations(source, destination) {
//     // Clear previous markers if any, except charging stations
//     markersLayer.clearLayers();

//     // Add markers for source and destination using custom icons
//     sourceMarker = L.marker([source[0], source[1]], { icon: sourceIcon })
//         .addTo(markersLayer)
//         .bindPopup('Source')
//         .openPopup();

//     destinationMarker = L.marker([destination[0], destination[1]], { icon: destinationIcon })
//         .addTo(markersLayer)
//         .bindPopup('Destination')
//         .openPopup();

//     // Adjust the map view to show both markers
//     const bounds = L.latLngBounds([source, destination]);
//     map.fitBounds(bounds, { padding: [50, 50] });
// }

// // Function to handle place names and coordinates and calculate the route
// async function calculateRoute(sourceInput, destinationInput, battery) {
//     // Clear previous routes
//     routeLayer.clearLayers();

//     try {
//         // Check if source and destination are coordinates or place names
//         let source, destination;

//         // If the input is a place name, use geocoding to get the coordinates
//         if (isNaN(sourceInput[0]) || isNaN(sourceInput[1])) {
//             // Geocode source place name
//             source = await geocodePlaceName(sourceInput);
//         } else {
//             // Source is already in [lat, lon] format
//             source = sourceInput;
//         }

//         if (isNaN(destinationInput[0]) || isNaN(destinationInput[1])) {
//             // Geocode destination place name
//             destination = await geocodePlaceName(destinationInput);
//         } else {
//             // Destination is already in [lat, lon] format
//             destination = destinationInput;
//         }

//         // Prepare the request body with [lon, lat] format
//         let body = {
//             coordinates: [
//                 [source[1], source[0]], // [lon, lat]
//                 [destination[1], destination[0]] // [lon, lat]
//             ]
//         };

//         // Fetch route data from OpenRouteService API
//         let response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
//             method: 'POST',
//             headers: {
//                 'Authorization': apiKey,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(body)
//         });

//         if (!response.ok) {
//             throw new Error("Error fetching route data: " + response.statusText);
//         }

//         let data = await response.json();

//         // Check if geometry is available
//         if (!data.routes || data.routes.length === 0) {
//             throw new Error("No route found.");
//         }

//         // Extract route geometry (assuming GeoJSON LineString)
//         const routeGeometry = data.routes[0].geometry;

//         // If geometry is encoded polyline, decode it
//         // Otherwise, assume it's a GeoJSON LineString
//         let routeCoordinates;
//         if (typeof routeGeometry === 'string') {
//             // If geometry is an encoded polyline, decode it
//             routeCoordinates = decodePolyline(routeGeometry).map(coord => [coord[0], coord[1]]);
//         } else if (routeGeometry.type === 'LineString') {
//             // If geometry is GeoJSON LineString
//             routeCoordinates = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]); // [lat, lon]
//         } else {
//             throw new Error("Unsupported geometry format.");
//         }

//         // Debugging: log coordinates to verify correctness
//         console.log("Route Coordinates: ", routeCoordinates);

//         // Draw the route on the map
//         const routeLine = L.polyline(routeCoordinates, {
//             color: '#00008B', // Google Maps blue
//             weight: 10,
//             opacity: 1,
//             lineCap: 'round',
//             lineJoin: 'round'
//         }).addTo(routeLayer);

//         // Optionally, add a white outline for better visibility
//         L.polyline(routeCoordinates, {
//             color: 'white',
//             weight: 9,
//             opacity: 0.8
//         }).addTo(routeLayer);

//         // Add hover effects to the route line
//         routeLine.on('mouseover', function () {
//             this.setStyle({
//                 weight: 8,
//                 opacity: 1
//             });
//         });

//         routeLine.on('mouseout', function () {
//             this.setStyle({
//                 weight: 5,
//                 opacity: 1
//             });
//         });

//         // Calculate distance, time, and battery consumption
//         let distance = data.routes[0].summary.distance / 1000; // Convert meters to kilometers
//         let duration = data.routes[0].summary.duration / 60; // Convert seconds to minutes
//         let batteryConsumptionPerKm = 0.2; // Define your own consumption rate
//         let batteryNeeded = distance * batteryConsumptionPerKm;

//         // Show the results
//         const resultDiv = document.getElementById('result');
//         if (batteryNeeded > battery) {
//             findNearestStation(source[0], source[1], batteryNeeded - battery);
//             resultDiv.innerHTML = `
//                 <p>Distance: ${distance.toFixed(2)} km</p>
//                 <p>Time: ${duration.toFixed(2)} minutes</p>
//                 <p>Battery needed: ${batteryNeeded.toFixed(2)}%. You need to charge your vehicle.</p>
//             `;
//         } else {
//             resultDiv.innerHTML = `
//                 <p>Distance: ${distance.toFixed(2)} km</p>
//                 <p>Time: ${duration.toFixed(2)} minutes</p>
//                 <p>You have enough battery to reach your destination. Battery needed: ${batteryNeeded.toFixed(2)}%</p>
//             `;
//         }

//         // Fit the map to show the entire route with padding
//         map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [50, 50] });

//     } catch (error) {
//         console.error("Error calculating route:", error);
//         document.getElementById('result').innerHTML = "Failed to calculate the route. " + error.message;
//     }
// }

// // Function to geocode a place name to lat/lon using OpenCage Geocoder API
// async function geocodePlaceName(placeName) {
//     const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(placeName)}&key=YOUR_GEOCODE_API_KEY`;

//     let response = await fetch(geocodeUrl);
//     if (!response.ok) {
//         throw new Error("Geocoding failed.");
//     }
    
//     let data = await response.json();
//     if (data.results.length === 0) {
//         throw new Error("Place not found.");
//     }
    
//     // Return the coordinates from the geocode result
//     return [data.results[0].geometry.lat, data.results[0].geometry.lng];
// }

// // Function to decode the polyline string (if needed)
// function decodePolyline(polyline) {
//     const coordinates = [];
//     let index = 0, len = polyline.length;
//     let lat = 0, lng = 0;

//     while (index < len) {
//         let b, shift = 0, result = 0;
//         do {
//             b = polyline.charCodeAt(index++) - 63;
//             result |= (b & 0x1f) << shift;
//             shift += 5;
//         } while (b >= 0x20);
//         const dlat = (result >> 1) ^ -(result & 1);
//         lat += dlat;

//         shift = 0;
//         result = 0;
//         do {
//             b = polyline.charCodeAt(index++) - 63;
//             result |= (b & 0x1f) << shift;
//             shift += 5;
//         } while (b >= 0x20);
//         const dlng = (result >> 1) ^ -(result & 1);
//         lng += dlng;

//         coordinates.push([lat / 1E5, lng / 1E5]); // [lat, lon]
//     }
//     return coordinates;
// }

// // Find nearest charging station
// function findNearestStation(lat, lon, extraBatteryNeeded) {
//     fetch('stations.json')
//         .then(response => response.json())
//         .then(stationsData => {
//             let nearestStation = null;
//             let minDistance = Infinity;

//             // Calculate distance to each station
//             stationsData.stations.forEach(station => {
//                 let dist = haversineDistance(lat, lon, station.lat, station.lon);
//                 if (dist < minDistance) {
//                     minDistance = dist;
//                     nearestStation = station;
//                 }
//             });

//             // Check if nearest station is found
//             if (nearestStation) {
//                 // Remove previous station marker if it exists
//                 if (stationMarker) {
//                     map.removeLayer(stationMarker);
//                 }

//                 // Create a custom icon for the charging station
//                 const chargingIcon = L.icon({
//                     iconUrl: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', // External green marker icon
//                     iconSize: [32, 32],
//                     iconAnchor: [16, 32],
//                     popupAnchor: [0, -32]
//                 });

//                 // Mark the nearest station on the map
//                 stationMarker = L.marker([nearestStation.lat, nearestStation.lon], { icon: chargingIcon })
//                     .addTo(map)
//                     .bindPopup(`${nearestStation.name} at (${nearestStation.lat}, ${nearestStation.lon})`)
//                     .openPopup();

//                 // Display result
//                 showResult(`You need to charge your vehicle. Nearest Station: ${nearestStation.name}`);
//             } else {
//                 showResult("No charging stations found nearby.");
//             }
//         })
//         .catch(error => {
//             console.error("Error finding nearest station:", error);
//             showResult("Failed to find the nearest charging station. " + error.message);
//         });
// }

// // Haversine distance calculation function
// function haversineDistance(lat1, lon1, lat2, lon2) {
//     const R = 6371; // Earth radius in km
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a = Math.sin(dLat / 2) ** 2 +
//               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//               Math.sin(dLon / 2) ** 2;
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// // Display result in a div
// function showResult(message) {
//     const resultDiv = document.getElementById('result');
//     resultDiv.innerHTML = message;
// }
// // Function to get location suggestions using OpenRouteService Geocoding API
// async function getLocationSuggestions(query) {
//     const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&size=5`);
//     if (response.ok) {
//         const data = await response.json();
//         return data.features.map(feature => ({
//             name: feature.properties.label,
//             coordinates: feature.geometry.coordinates // [lon, lat]
//         }));
//     } else {
//         console.error("Error fetching location suggestions:", response.statusText);
//         return [];
//     }
// }

// // Function to create and display dropdown suggestions
// function displaySuggestions(inputElement, suggestions) {
//     // Clear previous suggestions
//     let dropdown = inputElement.nextElementSibling;
//     if (dropdown && dropdown.classList.contains('suggestions-dropdown')) dropdown.remove();

//     // Check if there are suggestions; if not, exit
//     if (suggestions.length === 0) return;

//     // Create a container for suggestions
//     dropdown = document.createElement('div');
//     dropdown.classList.add('suggestions-dropdown');
//     inputElement.parentNode.insertBefore(dropdown, inputElement.nextSibling);

//     // Populate the dropdown with suggestions
//     suggestions.forEach(suggestion => {
//         const option = document.createElement('div');
//         option.textContent = suggestion.name;
//         option.classList.add('suggestion-item');
//         option.onclick = () => {
//             inputElement.value = suggestion.name;
//             inputElement.setAttribute('data-coordinates', JSON.stringify(suggestion.coordinates)); // Save coordinates
//             dropdown.remove(); // Hide dropdown after selection
//         };
//         dropdown.appendChild(option);
//     });
// }

// // Function to handle input changes and fetch suggestions
// async function handleInputChange(event) {
//     const query = event.target.value.trim();
//     const inputElement = event.target;

//     if (query.length > 2) {
//         // Fetch and display suggestions if input has more than 2 characters
//         const suggestions = await getLocationSuggestions(query);
//         displaySuggestions(inputElement, suggestions);
//     } else {
//         // Clear suggestions if input is less than 3 characters
//         const dropdown = inputElement.nextElementSibling;
//         if (dropdown && dropdown.classList.contains('suggestions-dropdown')) {
//             dropdown.remove();
//         }
//     }
// }

// // Attach event listeners for source and destination input fields
// document.getElementById('source').addEventListener('input', handleInputChange);
// document.getElementById('destination').addEventListener('input', handleInputChange);

// // Hide suggestions dropdown when clicking outside of it
// document.addEventListener('click', (event) => {
//     const dropdowns = document.querySelectorAll('.suggestions-dropdown');
//     dropdowns.forEach(dropdown => {
//         if (!dropdown.contains(event.target) && !dropdown.previousElementSibling.contains(event.target)) {
//             dropdown.remove();
//         }
//     });
// });

// // Modify form submit handler to extract coordinates from selected suggestions
// document.getElementById('ev-form').addEventListener('submit', function (e) {
//     e.preventDefault();

//     // Retrieve coordinates from the source and destination input elements
//     let sourceCoords = document.getElementById('source').getAttribute('data-coordinates');
//     let destinationCoords = document.getElementById('destination').getAttribute('data-coordinates');
//     let battery = parseFloat(document.getElementById('battery').value);



//     // Parse coordinates
//     sourceCoords = JSON.parse(sourceCoords);
//     destinationCoords = JSON.parse(destinationCoords);

//     // Call function to mark locations and calculate route
//     markLocations([sourceCoords[1], sourceCoords[0]], [destinationCoords[1], destinationCoords[0]]);
//     calculateRoute([sourceCoords[1], sourceCoords[0]], [destinationCoords[1], destinationCoords[0]], battery);
// });
