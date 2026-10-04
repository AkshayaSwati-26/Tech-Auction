import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Display from "./pages/Display";
import AdminLayout from "./pages/admin/AdminLayout";
import Login from "./pages/admin/Login";
import Overview from "./pages/admin/Overview";
import AuctionControl from "./pages/admin/AuctionControl";
import Teams from "./pages/admin/Teams";
import Lots from "./pages/admin/Lots";
import History from "./pages/admin/History";
import Settings from "./pages/admin/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/display" element={<Display />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="control" element={<AuctionControl />} />
          <Route path="teams" element={<Teams />} />
          <Route path="lots" element={<Lots />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
