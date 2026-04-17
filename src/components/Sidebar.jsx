import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Library, CheckCircle, LogOut, MessageSquare } from 'lucide-react';
import { auth, db } from '../firebase/firebase';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';

const Sidebar = () => {
  const location = useLocation();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'users', auth.currentUser.uid, 'sessions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loaded.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSessions(loaded);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  const navItems = [
    { path: '/', label: 'Overview', icon: BookOpen },
    { path: '/study', label: 'Study Room', icon: CheckCircle },
    { path: '/library', label: 'Shared Library', icon: Library },
  ];

  return (
    <div className="glass-panel" style={{ width: '260px', margin: '1rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
        <h2 className="gradient-text" style={{ fontSize: '1.5rem', margin: 0 }}>AI Study<br/>Assistant</h2>
      </div>
      
      <nav style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-glass-light)' : 'transparent',
                border: isActive ? '1px solid var(--border-glass)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontWeight: isActive ? 600 : 500
              }}
            >
              <Icon size={20} color={isActive ? "var(--accent-primary)" : "currentColor"} />
              {item.label}
            </Link>
          )
        })}
        
        {sessions.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600, padding: '0 1rem' }}>
              Recent Sessions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', maxHeight: '40vh' }}>
              {sessions.map((s) => {
                const isSessionActive = location.pathname === '/study' && location.search.includes(`sessionId=${s.id}`);
                return (
                  <Link 
                    key={s.id} 
                    to={`/study?sessionId=${s.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      color: isSessionActive ? 'white' : 'var(--text-secondary)',
                      background: isSessionActive ? '#ffffff10' : 'transparent',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <MessageSquare size={16} color={isSessionActive ? "var(--accent-primary)" : "currentColor"} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.documentName}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            width: '100%',
            padding: '0.75rem 1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--danger)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '1rem'
          }}
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
