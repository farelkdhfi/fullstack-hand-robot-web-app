import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HandRobotDashboard from './pages/HandRobotDashboard';

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<HandRobotDashboard />} />
        </Routes>
    </Router>
  );
}

export default App;