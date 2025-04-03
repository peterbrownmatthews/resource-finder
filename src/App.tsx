import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';
import './App.css';

const containerStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute' as const
};

// Default center (will be updated with user's location)
const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194
};

type Place = {
  id: string;
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity: string;
  types: string[];
  rating?: number;
};

// Resource type mapping for search terms
const resourceTypes = {
  shelter: [
    { type: '', keyword: 'homeless shelter' },
    { type: '', keyword: 'emergency shelter' },
    { type: '', keyword: "women's shelter" },
    { type: '', keyword: 'family shelter' }
  ],
  food: [
    { type: '', keyword: 'food bank' },
    { type: '', keyword: 'food pantry' },
    { type: '', keyword: 'soup kitchen' },
    { type: '', keyword: 'meals' }
  ],
  clothing: [
    { type: '', keyword: 'goodwill' },
    { type: '', keyword: 'salvation army' },
    { type: '', keyword: 'thrift store' },
    { type: '', keyword: 'donation center' }
  ]
};

function App() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  });

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          if (map) {
            map.panTo(newLocation);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Using default location.');
        }
      );
    }
  }, [map]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Function to fit map bounds to show all markers
  const adjustMapBounds = useCallback((locations: Place[]) => {
    if (!map || locations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    locations.forEach(place => {
      bounds.extend({
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      });
    });
    
    map.fitBounds(bounds);

    // Add some padding to the bounds
    const padding = {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50
    };
    
    const newBounds = map.getBounds();
    if (newBounds) {
      map.fitBounds(newBounds, padding);
    }
  }, [map]);

  const searchResources = async (type: 'shelter' | 'food' | 'clothing') => {
    if (!map) return;

    setLoading(true);
    setError(null);
    const center = map.getCenter();
    if (!center) return;

    try {
      // Search with a fixed radius first
      const searchPromises = resourceTypes[type].map(async ({ keyword }) => {
        try {
          console.log(`Searching for "${keyword}" with radius 50000`);
          const response = await axios.get(`http://localhost:3001/api/places`, {
            params: {
              lat: center.lat(),
              lng: center.lng(),
              keyword: keyword,
              radius: 50000 // Fixed 50km radius
            }
          });
          console.log(`Found ${response.data.results.length} results for "${keyword}"`);
          return response.data.results;
        } catch (err) {
          console.error(`Error searching for "${keyword}":`, err);
          return [];
        }
      });

      const resultsArrays = await Promise.all(searchPromises);
      const newPlaces = resultsArrays.flat();
      console.log(`Total raw results: ${newPlaces.length}`);
      
      // Remove duplicates based on place_id instead of id
      const uniquePlaces = Array.from(
        new Map(newPlaces.map(place => [place.place_id || place.id, place])).values()
      );
      console.log(`Unique places: ${uniquePlaces.length}`);
      
      // Sort by distance from center
      uniquePlaces.sort((a, b) => {
        const distanceA = Math.sqrt(
          Math.pow(a.geometry.location.lat - center.lat(), 2) +
          Math.pow(a.geometry.location.lng - center.lng(), 2)
        );
        const distanceB = Math.sqrt(
          Math.pow(b.geometry.location.lat - center.lat(), 2) +
          Math.pow(b.geometry.location.lng - center.lng(), 2)
        );
        return distanceA - distanceB;
      });
      
      // Take exactly 20 results (or all if less than 20)
      const finalResults = uniquePlaces.slice(0, 20);
      console.log(`Final results to display: ${finalResults.length}`);
      
      setPlaces(finalResults);
      
      // Adjust map bounds to show all results
      adjustMapBounds(finalResults);
      
      if (finalResults.length === 0) {
        setError('No resources found in this area. Please try a different location.');
      } else if (finalResults.length < 20) {
        setError(`Found ${finalResults.length} resources in this area.`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Community Resource Finder</h1>
        <div className="search-buttons">
          <button onClick={() => searchResources('shelter')}>Find Free Shelters</button>
          <button onClick={() => searchResources('food')}>Find Free Food</button>
          <button onClick={() => searchResources('clothing')}>Find Free Clothing</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Searching for resources...</div>}

      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation}
          zoom={11}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              position={{
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng
              }}
              onClick={() => setSelectedPlace(place)}
            />
          ))}

          {selectedPlace && (
            <InfoWindow
              position={{
                lat: selectedPlace.geometry.location.lat,
                lng: selectedPlace.geometry.location.lng
              }}
              onCloseClick={() => setSelectedPlace(null)}
            >
              <div className="info-window">
                <h3>{selectedPlace.name}</h3>
                <p>{selectedPlace.vicinity}</p>
                {selectedPlace.rating && (
                  <p>Rating: {selectedPlace.rating} ⭐</p>
                )}
                <div className="info-actions">
                  <button 
                    onClick={() => {
                      window.open(`https://www.google.com/maps/search/?api=1&query=${selectedPlace.geometry.location.lat},${selectedPlace.geometry.location.lng}&query_place_id=${selectedPlace.place_id}`, '_blank');
                    }}
                  >
                    Get Directions
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedPlace.name)}`, '_blank');
                    }}
                  >
                    Search Online
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      ) : (
        <div>Loading map... </div>
      )}
    </div>
  );
}

export default App;
