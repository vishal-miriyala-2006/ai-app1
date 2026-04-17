import { User, Settings } from 'lucide-react';

const Header = ({ user }) => {
  return (
    <header className="glass-panel" style={{ margin: '1rem 2rem 1rem 0', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Welcome back, {user?.email?.split('@')[0] || 'Student'}!</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ready to ace your exams?</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Difficulty:</span>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '0.5rem', background: 'var(--bg-primary)' }}
            onChange={(e) => localStorage.setItem('gemini_difficulty', e.target.value)}
            defaultValue={localStorage.getItem('gemini_difficulty') || 'Medium'}
          >
            <option value="Easy">Easy (Explain like I'm 5)</option>
            <option value="Medium">Medium (College Level)</option>
            <option value="Hard">Hard (Expert/PhD Level)</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <Settings size={20} />
          </button>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
