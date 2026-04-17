import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { chatWithDocument, generateQuiz, generateFlashcards } from '../api/gemini';
import { Upload, Send, FileText, BrainCircuit, X, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '../firebase/firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const StudyRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const urlSessionId = searchParams.get('sessionId');

  const [pdfText, setPdfText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [flashcards, setFlashcards] = useState(null);
  const [activeTab, setActiveTab] = useState('selection');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [flippedCardId, setFlippedCardId] = useState(null);

  useEffect(() => {
    if (urlSessionId && auth.currentUser) {
      const fetchSession = async () => {
        setIsProcessing(true);
        try {
          const docRef = doc(db, 'users', auth.currentUser.uid, 'sessions', urlSessionId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFileName(data.documentName || "Loaded Session");
            setPdfText(data.pdfText || "");
            setChatHistory(data.chatHistory || []);
            setQuiz(data.quiz || null);
            setFlashcards(data.flashcards || null);
            setSessionId(urlSessionId);
            setActiveTab('selection');
          }
        } catch (e) {
          console.error("Failed to load session", e);
        } finally {
          setIsProcessing(false);
        }
      }
      fetchSession();
    }
  }, [urlSessionId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setIsProcessing(true);

    try {
      // 1. Process PDF locally for AI First!
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        text += `\n--- Page ${i} ---\n${pageText}`;
      }
      setPdfText(text);

      let currentSessionId = null;
      if (auth.currentUser) {
        try {
          const sessionDoc = await addDoc(collection(db, 'users', auth.currentUser.uid, 'sessions'), {
            documentName: file.name,
            pdfText: text,
            chatHistory: [],
            quiz: null,
            flashcards: null,
            createdAt: new Date().toISOString()
          });
          currentSessionId = sessionDoc.id;
          setSessionId(sessionDoc.id);
          
          // Clear URL parameter so we don't reload the old session
          navigate('/study', { replace: true });
        } catch (e) {
          console.warn('Could not create session in firestore', e);
        }
      }
      
      setChatHistory([]);
      setQuiz(null);
      setFlashcards(null);
      setActiveTab('selection');
      // Immediately release lock so UI is usable even if Firebase hangs
      setIsProcessing(false);

      // 2. Upload to Firebase Storage (Fire and Forget Background task)
      const currentUser = auth.currentUser;
      if (currentUser && currentSessionId) {
        const storageRef = ref(storage, `uploads/${currentUser.uid}/${Date.now()}_${file.name}`);
        uploadBytes(storageRef, file).then(snapshot => {
          return getDownloadURL(snapshot.ref);
        }).then(downloadUrl => {
          updateDoc(doc(db, 'users', currentUser.uid, 'sessions', currentSessionId), { downloadUrl });
          return addDoc(collection(db, 'shared_notes'), {
            title: file.name.replace('.pdf', ''),
            author: currentUser.email?.split('@')[0] || 'Student',
            downloadUrl: downloadUrl,
            upvotes: 0,
            tags: ['Community Note'],
            createdAt: new Date().toISOString()
          });
        }).catch(uploadErr => {
          console.warn("Storage upload failed in background (likely CORS), but text extraction succeeded:", uploadErr);
        });
      }
    } catch (err) {
      console.error(err);
      alert("Error processing PDF locally!");
      setIsProcessing(false);
    }
  };

  const clearSession = () => {
    setPdfText("");
    setActiveTab('selection');
    setQuiz(null);
    setFlashcards(null);
    setChatHistory([]);
    setSessionId(null);
    navigate('/study', { replace: true });
  };

  const handleStartChat = () => {
    setActiveTab('chat');
    if (chatHistory.length === 0) {
      const initialChat = [{ role: 'assistant', content: "I've loaded the document! What would you like to know?" }];
      setChatHistory(initialChat);
      if (sessionId && auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId), { chatHistory: initialChat }).catch(e => console.warn(e));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !pdfText || isAiResponding) return;
    
    const userMsg = message;
    setMessage("");
    const addedUserHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(addedUserHistory);
    setIsAiResponding(true);

    const difficulty = localStorage.getItem('gemini_difficulty') || 'Medium';
    const response = await chatWithDocument(pdfText, userMsg, difficulty);
    
    const finalHistory = [...addedUserHistory, { role: 'assistant', content: response }];
    setChatHistory(finalHistory);
    setIsAiResponding(false);

    if (sessionId && auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId), {
          chatHistory: finalHistory
        });
      } catch (e) {
        console.warn("Failed to sync chat:", e);
      }
    }
  };

  const handleGenerateQuiz = async () => {
    setActiveTab('quiz');
    if (!pdfText || quiz) return;
    
    setQuiz('loading');
    const difficulty = localStorage.getItem('gemini_difficulty') || 'Medium';
    const quizResponse = await generateQuiz(pdfText, difficulty);
    try {
      const parsed = JSON.parse(quizResponse);
      setQuiz(parsed);
      if (sessionId && auth.currentUser) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId), { quiz: parsed });
        } catch(e) {
          console.warn("Failed to sync quiz:", e);
        }
      }
    } catch (e) {
      setQuiz([]);
    }
  };

  const handleGenerateFlashcards = async () => {
    setActiveTab('flashcards');
    if (!pdfText || flashcards) return;
    
    setFlashcards('loading');
    const difficulty = localStorage.getItem('gemini_difficulty') || 'Medium';
    const flashResponse = await generateFlashcards(pdfText, difficulty);
    try {
      const parsed = JSON.parse(flashResponse);
      setFlashcards(parsed);
      if (sessionId && auth.currentUser) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId), { flashcards: parsed });
        } catch(e) {
          console.warn("Failed to sync flashcards:", e);
        }
      }
    } catch (e) {
      setFlashcards([]);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2rem', margin: 0 }}>Study Room</h1>
        
        {pdfText && activeTab !== 'selection' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className={activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}
              onClick={handleStartChat}
            >
              Q&A Chat
            </button>
            <button 
              className={activeTab === 'quiz' ? 'btn-primary' : 'btn-secondary'}
              onClick={handleGenerateQuiz}
            >
              <BrainCircuit size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
              Practice Quiz
            </button>
            <button 
              className={activeTab === 'flashcards' ? 'btn-primary' : 'btn-secondary'}
              onClick={handleGenerateFlashcards}
            >
              <Layers size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
              Revision Cards
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        {/* Left Side: Document Panel */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--accent-primary)" />
            Document Source
          </h3>
          
          {!pdfText ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-glass)', borderRadius: '12px', background: 'var(--bg-glass-light)' }}>
              {isProcessing ? (
                <>
                  <div style={{ marginBottom: '1rem', color: 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading Session...</div>
                  <p style={{ color: 'var(--text-secondary)' }}>Retrieving your document and AI context.</p>
                </>
              ) : (
                <>
                  <Upload size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ margin: '0 0 0.5rem' }}>Upload Textbook or Notes</h4>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>PDF files only, up to 50MB</p>
                  
                  <label className="btn-primary" style={{ cursor: 'pointer' }}>
                    Select File
                    <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{fileName}</strong>
                <button onClick={clearSession} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              {pdfText}
            </div>
          )}
        </div>

        {/* Right Side: AI Interaction */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {!pdfText && (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Upload or select a document to unlock AI features
             </div>
          )}

          {pdfText && activeTab === 'selection' && (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Document Ready.</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>What would you like to do next?</p>
                <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '300px', flexDirection: 'column' }}>
                  <button className="btn-primary" onClick={handleStartChat} style={{ padding: '1rem', fontSize: '1rem' }}>
                    💬 Start Q&A Chat
                  </button>
                  <button className="btn-secondary" onClick={handleGenerateQuiz} style={{ padding: '1rem', fontSize: '1rem' }}>
                    📝 Generate Practice Quiz
                  </button>
                  <button className="btn-secondary" onClick={handleGenerateFlashcards} style={{ padding: '1rem', fontSize: '1rem' }}>
                    🗂️ Generate Revision Cards
                  </button>
                </div>
             </div>
          )}

          {activeTab === 'chat' && (
            <>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-glass-light)' }}>
                <h3 style={{ margin: 0 }}>AI Tutor Chat</h3>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {chatHistory.map((m, i) => (
                    <div key={i} style={{ 
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      background: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-glass-light)',
                      border: '1px solid var(--border-glass)',
                      padding: '1rem',
                      borderRadius: '12px',
                      maxWidth: '85%',
                      lineHeight: '1.5'
                    }}>
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ))}
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ flex: 1 }}
                  placeholder="Ask a question about the document..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!pdfText || isProcessing || isAiResponding}
                />
                <button className="btn-primary" onClick={handleSendMessage} disabled={!pdfText || isProcessing || isAiResponding} style={{ padding: '0.75rem' }}>
                  <Send size={20} />
                </button>
              </div>
            </>
          )}

          {activeTab === 'quiz' && (
             <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
               <h3 style={{ marginTop: 0, marginBottom: '2rem' }}>Practice Quiz</h3>
               {quiz === 'loading' && <p style={{ color: 'var(--accent-primary)' }}>Generating quiz with Gemini AI...</p>}
               {Array.isArray(quiz) && quiz.map((q, i) => (
                 <div key={i} className="glass-card" style={{ marginBottom: '1.5rem' }}>
                   <h4 style={{ margin: '0 0 1rem' }}>{i + 1}. {q.question}</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     {q.options?.map((opt, j) => (
                       <label key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                         <input type="radio" name={`q-${i}`} />
                         {opt}
                       </label>
                     ))}
                   </div>
                   <details style={{ marginTop: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                     <summary style={{ outline: 'none' }}>Show Answer</summary>
                     <p style={{ marginTop: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>{q.answer}</p>
                     <p style={{ margin: '0.5rem 0 0 0' }}>{q.explanation}</p>
                   </details>
                 </div>
               ))}
               {!Array.isArray(quiz) && quiz !== 'loading' && <p>Error generating quiz.</p>}
             </div>
          )}

          {activeTab === 'flashcards' && (
             <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
               <h3 style={{ marginTop: 0, marginBottom: '2rem' }}>Revision Cards</h3>
               {flashcards === 'loading' && <p style={{ color: 'var(--accent-primary)' }}>Extracting key concepts with Gemini AI...</p>}
               
               {Array.isArray(flashcards) && (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                   {flashcards.map((card, i) => (
                     <div 
                        key={i} 
                        onClick={() => setFlippedCardId(flippedCardId === i ? null : i)}
                        style={{ 
                          height: '150px', 
                          perspective: '1000px', 
                          cursor: 'pointer' 
                        }}
                      >
                        <div style={{
                          width: '100%',
                          height: '100%',
                          transition: 'transform 0.6s',
                          transformStyle: 'preserve-3d',
                          transform: flippedCardId === i ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          position: 'relative'
                        }}>
                          {/* Front */}
                          <div className="glass-card" style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            border: '1px solid var(--accent-primary)',
                            padding: '1rem',
                            boxSizing: 'border-box'
                          }}>
                            <h4 style={{ margin: 0 }}>{card.front}</h4>
                          </div>
                          {/* Back */}
                          <div className="glass-card" style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            transform: 'rotateY(180deg)',
                            background: 'var(--bg-glass-light)',
                            padding: '1rem',
                            boxSizing: 'border-box'
                          }}>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{card.back}</p>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
               {!Array.isArray(flashcards) && flashcards !== 'loading' && <p>Error generating flashcards.</p>}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StudyRoom;
