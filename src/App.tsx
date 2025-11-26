import React from 'react';
import { useStore } from './lib/store';
import { Login } from './components/Login';
import { Calendar } from './components/Calendar';
import { AdminDashboard } from './components/AdminDashboard';
import { ChangePasswordModal } from './components/ChangePasswordModal';

function App() {
  const currentUser = useStore((state) => state.currentUser);

  if (!currentUser) {
    return <Login />;
  }

  // Show change password modal if user must change password
  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordModal
        onClose={() => {}}
        onSuccess={() => {
          // Password changed successfully, user can now access the app
        }}
      />
    );
  }

  return currentUser.role === 'ADMIN' ? <AdminDashboard /> : <Calendar />;
}

export default App;
