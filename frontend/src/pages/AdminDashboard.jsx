import { useState } from 'react';
import AdminConfig from './admin/AdminConfig';
import AdminPlanning from './admin/AdminPlanning';
import AdminUsers from './admin/AdminUsers';

const TABS = [
  { id: 'planning', label: 'Planning du jour' },
  { id: 'config', label: 'Configuration' },
  { id: 'users', label: 'Adhérents' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('planning');

  return (
    <div className="page">
      <h1>Espace administrateur</h1>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'planning' && <AdminPlanning />}
      {tab === 'config' && <AdminConfig />}
      {tab === 'users' && <AdminUsers />}
    </div>
  );
}
