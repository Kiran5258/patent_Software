import React, { useState } from 'react';
import DocumentForm from './components/DocumentForm';
import FigureUpload from './components/FigureUpload';
import DocumentList from './components/DocumentList';
import { FileText, List, Sparkles, LogOut, Users } from 'lucide-react';
import Login from './components/Login';
import UserList from './components/UserList';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'records' : 'documents');
  const [editingDoc, setEditingDoc] = useState(null);

  const handleLoginSuccess = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setActiveTab(data.user.role === 'admin' ? 'records' : 'documents');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setActiveTab('documents');
  };

  const handleCancelEdit = () => {
    setEditingDoc(null);
    setActiveTab('records');
  };

  return (
    <div style={{ padding: '2rem 1rem' }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '3rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          padding: '0.75rem',
          borderRadius: '16px',
          display: 'inline-flex',
          marginBottom: '1rem',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          <Sparkles color="white" size={32} />
        </div>
        <h1 style={{ fontSize: '3rem', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          PatentForge
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          The ultimate engine for rapid patent documentation and figure generation.
        </p>
      </header>

      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '3rem',
        position: 'sticky',
        top: '1rem',
        zIndex: 10
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          padding: '0.5rem',
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => { setActiveTab('documents'); setEditingDoc(null); }}
            style={{
              background: activeTab === 'documents' ? 'var(--primary)' : 'transparent',
              borderRadius: '14px',
              padding: '0.75rem 1.5rem',
              boxShadow: activeTab === 'documents' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <FileText size={18} /> {editingDoc ? 'Edit Record' : 'Patent Details'}
          </button>
          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('records')}
                style={{
                  background: activeTab === 'records' ? 'var(--primary)' : 'transparent',
                  borderRadius: '14px',
                  padding: '0.75rem 1.5rem',
                  boxShadow: activeTab === 'records' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                <List size={18} /> Records
              </button>
              <button
                onClick={() => setActiveTab('users')}
                style={{
                  background: activeTab === 'users' ? 'var(--primary)' : 'transparent',
                  borderRadius: '14px',
                  padding: '0.75rem 1.5rem',
                  boxShadow: activeTab === 'users' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                <Users size={18} /> Users
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: '14px',
              padding: '0.75rem 1.5rem',
            }}
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {editingDoc ? (
          <DocumentForm initialData={editingDoc} onCancel={handleCancelEdit} user={user} />
        ) : (
          <>
            {activeTab === 'documents' && <DocumentForm onCancel={handleCancelEdit} user={user} />}
            {activeTab === 'records' && user.role === 'admin' && <DocumentList onEdit={handleEdit} />}
            {activeTab === 'users' && user.role === 'admin' && <UserList />}
          </>
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        marginTop: '6rem',
        padding: '2rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--glass-border)'
      }}>
        <p>&copy; 2026 PatentForge AI. Secure. Reliable. Professional.</p>
      </footer>
    </div>
  );
}

export default App;
