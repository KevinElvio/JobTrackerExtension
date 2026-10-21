import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout/Layout";
import Dashboard from "./components/Dashboard/Dashboard";
import Applications from "./components/Applications/Applications";
import Statistics from "./components/Statistics/Statistics";
import Templates from "./components/Templates/Templates";
import Profile from "./components/Profile/Profile";

function AppContent() {
  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    switch (page) {
      case "applications": return <Applications />;
      case "statistics": return <Statistics />;
      case "templates": return <Templates />;
      case "profile": return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}