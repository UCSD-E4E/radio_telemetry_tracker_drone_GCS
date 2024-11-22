import React from 'react';
import Sidebar from './Sidebar';
import Map from './Map';
import './styles.css';


function App() {
  return (
    <div className="container">
      <Sidebar />
      <Map />
    </div>
  );
}

export default App;
