import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout/Layout";
import Login from "./components/Auth/Login";
import Dashboard from "./components/Dashboard/Dashboard";
import Applications from "./components/Applications/Applications";
import Statistics from "./components/Statistics/Statistics";
import Templates from "./components/Templates/Templates";

function AppContent() {
  const { isAuth } = useAuth();
  const [page, setPage] = useState("dashboard");

  if (!isAuth) return <Login />;

  const renderPage = () => {
    switch (page) {
      case "applications": return <Applications />;
      case "statistics": return <Statistics />;
      case "templates": return <Templates />;
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
