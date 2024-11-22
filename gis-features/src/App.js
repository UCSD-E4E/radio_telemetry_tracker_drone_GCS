import React from 'react';
import Sidebar from './Sidebar';
import Map from './Map';
import './styles.css';
import './leaflet/leaflet.css';


function App() {
  return (
    <div className="container">
      <Sidebar />
      <Map />
    </div>
  );
}

export default App;
