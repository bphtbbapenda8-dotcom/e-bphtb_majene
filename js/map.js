/**
 * map.js — Leaflet map initialization and NOP input masking
 */

/**
 * Initialize Leaflet map in a given container.
 * @param {string} containerId - ID of the map div element
 * @param {function} onCoordUpdate - Callback(lat, lng) when user picks a location
 */
function initMap(containerId, onCoordUpdate) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Destroy previous Leaflet instance if any
    if (el._leaflet_id) {
        el.innerHTML = '';
        el._leaflet_id = null;
    }

    const center = [-3.5321, 118.9734]; // Majene, Sulawesi Barat
    const map = L.map(containerId).setView(center, 13);

    // Satellite base layer (Esri)
    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri' }
    ).addTo(map);

    // Label overlay
    L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
        { pane: 'shadowPane' }
    ).addTo(map);

    const marker = L.marker(center, { draggable: true }).addTo(map);

    function update(latlng) {
        if (onCoordUpdate) {
            onCoordUpdate(latlng.lat.toFixed(6), latlng.lng.toFixed(6));
        }
    }

    marker.on('dragend', () => update(marker.getLatLng()));
    map.on('click', e => {
        marker.setLatLng(e.latlng);
        update(e.latlng);
    });
}

/**
 * Apply NOP PBB mask to input field
 * @param {string} inputId - ID of the input element
 */
function initNopMask(inputId) {
    const el = document.getElementById(inputId);
    if (!el || el._imask) return;
    el._imask = IMask(el, { mask: '00.00.000.000.000-0000.0' });
}
