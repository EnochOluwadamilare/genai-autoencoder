import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import LevelOne from "./pages/LevelOne/LevelOne";
import LevelTwo from "./pages/LevelTwo/LevelTwo";

import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/level-1" element={<LevelOne />} />
        <Route path="/level-2" element={<LevelTwo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
