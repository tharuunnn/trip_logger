import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";

function Home() {
  return (
    <h1 className="text-3xl font-bold text-center mt-10">
      Welcome to Trip Logger!
    </h1>
  );
}

function Trips() {
  return <h1 className="text-3xl font-bold text-center mt-10">Trips Page</h1>;
}

function App() {
  return (
    <Router>
      <nav className="flex gap-4 p-4 bg-gray-200">
        <Link to="/">Home</Link>
        <Link to="/trips">Trips</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trips" element={<Trips />} />
      </Routes>
    </Router>
  );
}

export default App;
