import { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';

type User = {
  firstName?: string;
  role?: string;
};

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  if (!user) {
    return <LoginPage onLoginSuccess={() => setUser(JSON.parse(localStorage.getItem('user') || '{}'))} />;
  }

  const logout = () => setUser(null);

  return user.role === 'ORGANIZER' ? (
    <OrganizerDashboard user={user} onLogout={logout} />
  ) : (
    <EventsPage user={user} onLogout={logout} />
  );
}

export default App;
