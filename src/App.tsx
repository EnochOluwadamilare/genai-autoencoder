import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import LevelOne from "./pages/LevelOne/LevelOne";
import LevelTwo from "./pages/LevelTwo/LevelTwo";
import LevelThree from "./pages/LevelThree/LevelThree";
import LevelFour from './pages/LevelFour/LevelFour';
import LevelBonus from './pages/LevelBonus/LevelBonus';

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
        <Route path="/level-3" element={<LevelThree />} />
        <Route path="/level-4" element={<LevelFour />} />
        <Route path="/level-bonus" element={<LevelBonus />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
