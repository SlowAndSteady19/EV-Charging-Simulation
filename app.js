<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EV Charging Simulation</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
</head>
<body>
  <div class="container">
    <div class="form-container">
      <h1>EV Charging Simulation</h1>
      <form id="ev-form">
        <label for="source">Source Location:</label>
        <input type="text" id="source" name="source" placeholder="e.g. Chennai, Tamil Nadu" required>
        
        <label for="destination">Destination Location:</label>
        <input type="text" id="destination" name="destination" placeholder="e.g. Coimbatore, Tamil Nadu" required>
        
        <label for="battery">Battery Percentage (%):</label>
        <input type="number" id="battery" name="battery" min="0" max="100" required>
        
        <button type="submit">Calculate Route</button>
      </form>
      <div id="result"></div>
    </div>
    
    <div class="map-container">
      <div id="map"></div>
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <script src="app.js"></script>
</body>
</html>









// API Key
// const apiKey = '5b3ce3597851110001cf62482476ed8df8234464b22b5a408706f90c';

// // Initialize map and layers
// let map = L.map('map').setView([13.0827, 80.2707], 12);
// let routeLayer = L.layerGroup().addTo(map);
// let markersLayer = L.layerGroup().addTo(map);
// let stationMarker;
// let sourceMarker, destinationMarker;

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
//     .addTo(markersLayer)
//     .bindPopup(`${station.name}`);

//         });
//     })
//     .catch(error => console.error("Error fetching stations:", error));

// // Create custom icons
// const sourceIcon = L.icon({
//     iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
//     shadowSize: [41, 41]
// });

// const destinationIcon = L.icon({
//     iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
//     shadowSize: [41, 41]
// });

// // Function to mark source and destination on the map
// function markLocations(source, destination) {
//     markersLayer.clearLayers();

//     sourceMarker = L.marker([source[0], source[1]], { icon: sourceIcon })
//         .addTo(markersLayer)
//         .bindPopup('Source')
//         .openPopup();

//     destinationMarker = L.marker([destination[0], destination[1]], { icon: destinationIcon })
//         .addTo(markersLayer)
//         .bindPopup('Destination');

//     const bounds = L.latLngBounds([source, destination]);
//     map.fitBounds(bounds, { padding: [50, 50] });
// }

// // Function to calculate route
// async function calculateRoute(source, destination, battery) {
//     routeLayer.clearLayers();

//     try {
//         // Build URL with coordinates
//         const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${source[1]},${source[0]}&end=${destination[1]},${destination[0]}`;
        
//         console.log("Request URL:", url);

//         // Fetch route data
//         let response = await fetch(url);

//         console.log("Response status:", response.status);
//         console.log("Response OK:", response.ok);

//         if (!response.ok) {
//             const errorText = await response.text();
//             console.error("API Error Response:", errorText);
//             throw new Error("API request failed: " + response.statusText);
//         }

//         let data = await response.json();

//         console.log("=== API RESPONSE ===");
//         console.log(data);
//         console.log("Has features?", !!data.features);
//         console.log("Has routes?", !!data.routes);
//         console.log("===================");

//         let routeCoordinates, distance, duration;

//         // Check if response has features (GeoJSON format)
//         if (data.features && data.features.length > 0) {
//             console.log("Processing GeoJSON format");
//             const feature = data.features[0];
//             const geometry = feature.geometry;
            
//             if (geometry.type === 'LineString') {
//                 // Convert [lon, lat] to [lat, lon]
//                 routeCoordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]);
//             } else {
//                 throw new Error("Unexpected geometry type: " + geometry.type);
//             }

//             // Extract distance and duration
//             if (feature.properties && feature.properties.summary) {
//                 distance = feature.properties.summary.distance / 1000; // km
//                 duration = feature.properties.summary.duration / 60; // minutes
//             } else if (feature.properties && feature.properties.segments) {
//                 distance = feature.properties.segments[0].distance / 1000;
//                 duration = feature.properties.segments[0].duration / 60;
//             } else {
//                 throw new Error("Could not find distance/duration in response");
//             }
//         } 
//         // Check if response has routes array
//         else if (data.routes && data.routes.length > 0) {
//             console.log("Processing routes format");
//             const route = data.routes[0];
//             const geometry = route.geometry;

//             if (typeof geometry === 'string') {
//                 // Encoded polyline
//                 routeCoordinates = decodePolyline(geometry);
//             } else if (geometry.coordinates) {
//                 routeCoordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]);
//             } else {
//                 throw new Error("Unknown geometry format");
//             }

//             distance = route.summary.distance / 1000;
//             duration = route.summary.duration / 60;
//         } else {
//             console.error("Unexpected API response format:", data);
//             throw new Error("No route data found in response");
//         }

//         console.log("Route coordinates count:", routeCoordinates.length);
//         console.log("Distance:", distance, "km");
//         console.log("Duration:", duration, "minutes");

//         // Draw the route
//         const routeLine = L.polyline(routeCoordinates, {
//             color: '#4285F4',
//             weight: 6,
//             opacity: 0.8,
//             lineCap: 'round',
//             lineJoin: 'round'
//         }).addTo(routeLayer);

//         L.polyline(routeCoordinates, {
//             color: '#1a73e8',
//             weight: 8,
//             opacity: 0.4
//         }).addTo(routeLayer);

//         // Calculate battery consumption
//         let batteryConsumptionPerKm = 0.33;
//         let batteryNeeded = distance * batteryConsumptionPerKm;

//         // Show results
//         const resultDiv = document.getElementById('result');
//         resultDiv.classList.add('show');
//         if (batteryNeeded > battery) {
            
//             findNearestStation(source[0], source[1], batteryNeeded - battery);
//             resultDiv.innerHTML = `
//                 <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
//                 <p><strong>Time:</strong> ${duration.toFixed(0)} minutes</p>
//                 <p><strong>Battery needed:</strong> ${batteryNeeded.toFixed(1)}%</p>
//                 <p style="color: #f44336;"><strong>⚠ Warning:</strong> You need to charge your vehicle!</p>
//             `;
//         } else {
//             resultDiv.innerHTML = `
//                 <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
//                 <p><strong>Time:</strong> ${duration.toFixed(0)} minutes</p>
//                 <p><strong>Battery needed:</strong> ${batteryNeeded.toFixed(1)}%</p>
//                 <p style="color: #4caf50;">✓ You have enough battery (${battery}%) to reach your destination.</p>
//             `;
//         }

//         map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [50, 50] });

//     } catch (error) {
//         console.error("Error calculating route:", error);
//         document.getElementById('result').innerHTML = `<p style="color: #f44336;">Failed to calculate route: ${error.message}</p>`;
//     }
// }

// // Function to decode polyline
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

//         coordinates.push([lat / 1E5, lng / 1E5]);
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

//             stationsData.stations.forEach(station => {
//                 let dist = haversineDistance(lat, lon, station.lat, station.lon);
//                 if (dist < minDistance) {
//                     minDistance = dist;
//                     nearestStation = station;
//                 }
//             });

//             if (nearestStation) {
//                 if (stationMarker) {
//                     map.removeLayer(stationMarker);
//                 }

//                 const chargingIcon = L.icon({
//                     iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
//                     iconSize: [25, 41],
//                     iconAnchor: [12, 41],
//                     popupAnchor: [1, -34],
//                     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
//                     shadowSize: [41, 41]
//                 });

//                 stationMarker = L.marker([nearestStation.lat, nearestStation.lon], { icon: chargingIcon })
//                     .addTo(map)
//                     .bindPopup(`<strong>Nearest Charging Station</strong><br>${nearestStation.name}<br>Distance: ${minDistance.toFixed(2)} km`)
//                     .openPopup();

//                 const resultDiv = document.getElementById('result');
//                 resultDiv.innerHTML += `<p><strong>Nearest Station:</strong> ${nearestStation.name} (${minDistance.toFixed(2)} km away)</p>`;
//             }
//         })
//         .catch(error => console.error("Error finding nearest station:", error));
// }

// // Haversine distance calculation
// function haversineDistance(lat1, lon1, lat2, lon2) {
//     const R = 6371;
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a = Math.sin(dLat / 2) ** 2 +
//               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
//               Math.sin(dLon / 2) ** 2;
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// // Get location suggestions
// async function getLocationSuggestions(query) {
//     try {
//         const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(query)}&size=5`);
//         if (response.ok) {
//             const data = await response.json();
//             return data.features.map(feature => ({
//                 name: feature.properties.label,
//                 coordinates: feature.geometry.coordinates
//             }));
//         }
//     } catch (error) {
//         console.error("Error fetching suggestions:", error);
//     }
//     return [];
// }

// // Display suggestions dropdown
// function displaySuggestions(inputElement, suggestions) {
//     let dropdown = inputElement.nextElementSibling;
//     if (dropdown && dropdown.classList.contains('suggestions-dropdown')) dropdown.remove();

//     if (suggestions.length === 0) return;

//     dropdown = document.createElement('div');
//     dropdown.classList.add('suggestions-dropdown');
//     inputElement.parentNode.insertBefore(dropdown, inputElement.nextSibling);

//     suggestions.forEach(suggestion => {
//         const option = document.createElement('div');
//         option.textContent = suggestion.name;
//         option.classList.add('suggestion-item');
//         option.onclick = () => {
//             inputElement.value = suggestion.name;
//             inputElement.setAttribute('data-coordinates', JSON.stringify(suggestion.coordinates));
//             dropdown.remove();
//         };
//         dropdown.appendChild(option);
//     });
// }

// // Handle input changes
// async function handleInputChange(event) {
//     const query = event.target.value.trim();
//     const inputElement = event.target;

//     if (query.length > 2) {
//         const suggestions = await getLocationSuggestions(query);
//         displaySuggestions(inputElement, suggestions);
//     } else {
//         const dropdown = inputElement.nextElementSibling;
//         if (dropdown && dropdown.classList.contains('suggestions-dropdown')) {
//             dropdown.remove();
//         }
//     }
// }

// // Attach event listeners
// document.getElementById('source').addEventListener('input', handleInputChange);
// document.getElementById('destination').addEventListener('input', handleInputChange);

// // Hide suggestions when clicking outside
// document.addEventListener('click', (event) => {
//     const dropdowns = document.querySelectorAll('.suggestions-dropdown');
//     dropdowns.forEach(dropdown => {
//         if (!dropdown.contains(event.target) && !dropdown.previousElementSibling.contains(event.target)) {
//             dropdown.remove();
//         }
//     });
// });

// // Form submit handler
// document.getElementById('ev-form').addEventListener('submit', async function (e) {
//     e.preventDefault();

//     try {
//         const sourceInput = document.getElementById('source').value.trim();
//         const destinationInput = document.getElementById('destination').value.trim();
//         const battery = parseFloat(document.getElementById('battery').value);

//         if (isNaN(battery) || battery < 0 || battery > 100) {
//             alert('Please enter a valid battery percentage (0-100)');
//             return;
//         }

//         let sourceCoords, destinationCoords;

//         const storedSourceCoords = document.getElementById('source').getAttribute('data-coordinates');
//         const storedDestCoords = document.getElementById('destination').getAttribute('data-coordinates');

//         if (storedSourceCoords) {
//             sourceCoords = JSON.parse(storedSourceCoords);
//             sourceCoords = [sourceCoords[1], sourceCoords[0]]; // Convert to [lat, lon]
//         } else if (sourceInput.includes(',')) {
//             const parts = sourceInput.split(',');
//             sourceCoords = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
//         } else {
//             alert('Please select a location from suggestions or enter: latitude,longitude');
//             return;
//         }

//         if (storedDestCoords) {
//             destinationCoords = JSON.parse(storedDestCoords);
//             destinationCoords = [destinationCoords[1], destinationCoords[0]];
//         } else if (destinationInput.includes(',')) {
//             const parts = destinationInput.split(',');
//             destinationCoords = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())];
//         } else {
//             alert('Please select a location from suggestions or enter: latitude,longitude');
//             return;
//         }

//         if (isNaN(sourceCoords[0]) || isNaN(sourceCoords[1]) || 
//             isNaN(destinationCoords[0]) || isNaN(destinationCoords[1])) {
//             alert('Invalid coordinates. Please check your input.');
//             return;
//         }

//         console.log("Source [lat, lon]:", sourceCoords);
//         console.log("Destination [lat, lon]:", destinationCoords);

//         markLocations(sourceCoords, destinationCoords);
//         await calculateRoute(sourceCoords, destinationCoords, battery);

//     } catch (error) {
//         console.error("Error in form submission:", error);
//         document.getElementById('result').innerHTML = `<p style="color: #f44336;">Error: ${error.message}</p>`;
//     }
// });
















