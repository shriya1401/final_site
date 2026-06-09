// App.jsx — Root component with React Router, dark mode, and layout
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home          from "./pages/Home";
import Simulation    from "./pages/Simulation";
import LearnAI       from "./pages/LearnAI";
import Cybersecurity from "./pages/Cybersecurity";
import Workshops     from "./pages/Workshops";
import Resources     from "./pages/Resources";
import Impact        from "./pages/Impact";
import About         from "./pages/About";
import EventFeedback from "./pages/EventFeedback";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  return (
    <div className={darkMode ? "dark" : ""}>
      <BrowserRouter>
        <div className="scan-line" />
        <Navbar darkMode={darkMode} toggleDark={() => setDarkMode(d => !d)} />
        <main>
          <Routes>
            <Route path="/"           element={<Home />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/learn"      element={<LearnAI />} />
            <Route path="/cyber"      element={<Cybersecurity />} />
            <Route path="/workshops"  element={<Workshops />} />
            <Route path="/resources"  element={<Resources />} />
            <Route path="/impact"     element={<Impact />} />
            <Route path="/about"      element={<About />} />
            <Route path="/feedback"   element={<EventFeedback />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}
