import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import FightDetailPage from "./pages/FightDetailPage";
import DebugDataPage from "./pages/DebugDataPage";
import FightsPage from "./pages/FightsPage";
import MyCardsPage from "./pages/MyCardsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<FightsPage />} />
        <Route path="/fight/:id" element={<FightDetailPage />} />
        <Route path="/cards" element={<MyCardsPage />} />
        <Route path="/debug/data" element={<DebugDataPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
