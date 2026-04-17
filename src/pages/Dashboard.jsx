import { UploadCloud, Clock, Library, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [topNotes, setTopNotes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (auth.currentUser) {
          const sessionsQuery = query(collection(db, 'users', auth.currentUser.uid, 'sessions'));
          const sessionDocs = await getDocs(sessionsQuery);
          let loadedSessions = sessionDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          loadedSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setSessions(loadedSessions.slice(0, 3));
        }

        const notesQuery = query(collection(db, 'shared_notes'), orderBy('upvotes', 'desc'), limit(3));
        const noteDocs = await getDocs(notesQuery);
        setTopNotes(noteDocs.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Dashboard DB error", err);
      }
    };
    fetchData();
  }, []);
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text">Your Study Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Upload a new document or jump back into your recent studies.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <UploadCloud size={32} color="white" />
          </div>
          <h3>Upload a New Document</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Upload PDFs to generate quizzes, flashcards, and chat with your notes.</p>
          <Link to="/study" className="btn-primary" style={{ textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}>Go to Study Room</Link>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Clock size={24} color="var(--accent-secondary)" />
            <h3 style={{ margin: 0 }}>Recent Study Sessions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sessions.length === 0 ? (
               <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                 No recent study sessions found. Go to Study Room to start!
               </div>
            ) : (
              sessions.map(s => (
                <Link key={s.id} to={`/study?sessionId=${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', transition: 'transform 0.2s', cursor: 'pointer' }}
                       onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                       onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    <h4 style={{ margin: '0 0 0.5rem' }}>{s.documentName}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="glass-card">
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Library size={24} color="var(--success)" />
            <h3 style={{ margin: 0 }}>Top Community Notes</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topNotes.length === 0 ? (
               <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                 No community notes available.
               </div>
            ) : (
                topNotes.map(note => (
                  <div key={note.id} style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem' }}>{note.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>By {note.author} • {note.upvotes || 0} Upvotes</p>
                    </div>
                    <ArrowRight size={16} color="var(--text-secondary)" />
                  </div>
                ))
            )}
          </div>
          <Link to="/library" className="btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem', boxSizing: 'border-box' }}>Explore Library</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
