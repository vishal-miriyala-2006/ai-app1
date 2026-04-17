import { Search, ThumbsUp, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const SharedLibrary = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [libraryItems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'shared_notes'));
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by created at descending
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLibraryItems(items);
      } catch (err) {
        console.error("Error fetching notes: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const handleUpvote = async (item) => {
    try {
      const noteRef = doc(db, 'shared_notes', item.id);
      await updateDoc(noteRef, {
        upvotes: (item.upvotes || 0) + 1
      });
      // Update local state to optimize UI response
      setLibraryItems(libraryItems.map(i => i.id === item.id ? { ...i, upvotes: (i.upvotes || 0) + 1 } : i));
    } catch (err) {
      console.error("Error upvoting: ", err);
    }
  };

  const filteredItems = libraryItems.filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text" style={{ margin: 0 }}>Shared Library</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Discover notes and study materials shared by other students.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search notes, topics, or authors..." 
            className="input-field" 
            style={{ paddingLeft: '3rem', width: '100%', boxSizing: 'border-box' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary">Search</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading library...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', overflowY: 'auto', paddingBottom: '2rem', alignContent: 'start' }}>
          {filteredItems.map(item => (
            <div key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '8px' }}>
                  <Star size={24} color="var(--warning)" />
                </div>
                <button 
                  onClick={() => handleUpvote(item)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-glass)', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                >
                  <ThumbsUp size={14} color="var(--accent-primary)" />
                  <span>{item.upvotes || 0}</span>
                </button>
              </div>
              
              <h3 style={{ margin: '0 0 0.5rem' }}>{item.title}</h3>
              <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>By {item.author}</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap', marginBottom: item.downloadUrl ? '1rem' : 0 }}>
                {item.tags?.map(tag => (
                  <span key={tag} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tag}
                  </span>
                ))}
              </div>

              {item.downloadUrl && (
                <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', fontSize: '0.85rem', padding: '0.5rem' }}>
                  View Document
                </a>
              )}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No shared notes found yet. Be the first to upload and share!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedLibrary;
