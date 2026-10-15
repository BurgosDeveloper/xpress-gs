import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { LoginView } from "./components/LoginView";
import { Sidebar, NavTab } from "./components/Sidebar";
import { LiveFleetMap } from "./components/LiveFleetMap";
import { RidesDispatchView } from "./components/RidesDispatchView";
import { DriversManagementView } from "./components/DriversManagementView";
import { PassengersView } from "./components/PassengersView";
import { SettingsView } from "./components/SettingsView";
import { apiGetLiveFleet } from "./services/api";
import { socketService } from "./services/socket";
import { Radio } from "lucide-react";

export function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>("map");
  const [pendingCount, setPendingCount] = useState(0);

  // Poll / Socket for pending rides count to show badge in sidebar
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPending = async () => {
      try {
        const res = await apiGetLiveFleet();
        if (res.ok) {
          setPendingCount(res.pendingRides?.length || 0);
        }
      } catch {}
    };

    void checkPending();
    const interval = setInterval(checkPending, 20000);

    const unsubCreated = socketService.on("ride:created", () => {
      void checkPending();
    });
    const unsubChanged = socketService.on("ride:changed", () => {
      void checkPending();
    });

    return () => {
      clearInterval(interval);
      unsubCreated();
      unsubChanged();
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#0A0A08] text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#141108] border-2 border-[#D4AF37]/50 flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)] mb-4 animate-pulse p-2">
          <img src="/logo_xpress.png" alt="Xpress" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
          Iniciando Centro de Control Satelital...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A08]">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        pendingRidesCount={pendingCount}
      />

      {/* Main Content View */}
      <main className="flex-1 h-full relative overflow-hidden bg-[#0A0A08]">
        {currentTab === "map" && <LiveFleetMap />}
        {currentTab === "dispatch" && <RidesDispatchView />}
        {currentTab === "drivers" && <DriversManagementView />}
        {currentTab === "passengers" && <PassengersView />}
        {currentTab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
export default App;
