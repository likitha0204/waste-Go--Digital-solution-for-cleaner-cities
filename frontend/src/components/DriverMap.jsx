import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'; // Import Routing CSS
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine'; // Import Routing Logic
import io from 'socket.io-client';
import API_URL from '../config';

// Fix Leaflet Default Icon Issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Truck Icon
const truckIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/713/713311.png', 
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Destination Icon
const destinationIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [1, -34],
});


// Routing Component
const RoutingControl = ({ start, end, onRouteFound }) => {
  const map = useMap();

  useEffect(() => {
    if (!start || !end) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#6FA1EC', weight: 4 }]
      },
      createMarker: function(i, wp, nWps) {
          return null; 
      },
      addWaypoints: false,
      draggableWaypoints: false,
      show: true 
    })
    .on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        // summary.totalDistance (meters), summary.totalTime (seconds)
        if (onRouteFound) {
            onRouteFound({
                distance: summary.totalDistance,
                time: summary.totalTime
            });
        }
    })
    .addTo(map);

    return () => {
      map.removeControl(routingControl);
    };
  }, [map, start, end]);

  return null;
};


// Component to recenter map when position changes
function RecenterAutomatically({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

const DriverMap = ({ schedules, driverId, socket: propSocket }) => {
    const [position, setPosition] = useState(null);
    const [localSocket, setLocalSocket] = useState(null);

    const socket = propSocket || localSocket;

    useEffect(() => {
        if (!propSocket) {
            // Connect Socket only if not provided
            const newSocket = io(API_URL);
            setLocalSocket(newSocket);
            return () => newSocket.disconnect();
        }
    }, [propSocket]);

    useEffect(() => {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by your browser");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = { lat: latitude, lng: longitude };
                setPosition(newPos);

                // Emit location to server
                if (socket) {
                    socket.emit('send_location', {
                        driverId: driverId,
                        lat: latitude,
                        lng: longitude
                    });
                }
            },
            (err) => console.error("Error getting location:", err),
            { 
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [socket, driverId]);

    // Find active schedule to route to
    const activeSchedule = schedules?.find(s => 
        (s.status === 'On the way' || s.status === 'Accepted') && s.latitude && s.longitude
    );

    return (
        <div style={{ height: '400px', width: '100%', borderRadius: '15px', overflow: 'hidden', border: '2px solid #2d6a4f' }}>
            {position ? (
                <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Driver's Live Position */}
                    <Marker position={[position.lat, position.lng]} icon={truckIcon}>
                        <Popup>
                            <b>🚛 You are here</b>
                        </Popup>
                    </Marker>
                    
                    {/* Routing to Active Schedule */}
                    {activeSchedule && (
                        <>
                            <Marker position={[activeSchedule.latitude, activeSchedule.longitude]} icon={destinationIcon}>
                                <Popup>
                                    <b>🎯 Pickup: {activeSchedule.name}</b><br/>
                                    {activeSchedule.address}
                                </Popup>
                            </Marker>
                            <RoutingControl 
                                start={position} 
                                end={{ lat: activeSchedule.latitude, lng: activeSchedule.longitude }} 
                                onRouteFound={(summary) => {
                                    // Calculate readable format
                                    const minutes = Math.round(summary.time / 60);
                                    const distanceKm = (summary.distance / 1000).toFixed(1);
                                    
                                    // Emit socket event if socket is available
                                    if (socket && activeSchedule.user) {
                                        // Handle both populated user object or direct ID
                                        const userId = activeSchedule.user._id || activeSchedule.user;
                                        
                                        socket.emit('driver_eta_update', {
                                            userId: userId,
                                            taskId: activeSchedule._id, // Add Task ID
                                            taskType: activeSchedule.wasteType ? 'pickup' : 'complaint', // Infer type
                                            etaText: `${minutes} mins`,
                                            etaSeconds: summary.time,
                                            distanceText: `${distanceKm} km`
                                        });
                                    }
                                }}
                            />
                        </>
                    )}

                    <RecenterAutomatically lat={position.lat} lng={position.lng} />

                </MapContainer>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#f0fdf4' }}>
                    <p>📍 Acquiring GPS Location...</p>
                </div>
            )}
        </div>
    );
};

export default DriverMap;
