import Home from "./pages/Home";
import { currentJourney } from "./data/currentJourney";

export default function App() {
  return <Home currentJourney={currentJourney} />;
}