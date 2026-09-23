import Sidebar from "./Sidebar";

export default function Layout({ children, activePage, onNavigate }) {
  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main className="main-content">{children}</main>
    </div>
  );
}
