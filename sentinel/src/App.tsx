import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CitizenReport from './pages/CitizenReport';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Clean up previous listener if any
        if (unsubscribeDoc) unsubscribeDoc();

        // Start listening to the user document in real-time
        unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Force admin role for the bootstrap email
            const role = firebaseUser.email === 'gayatri.pavaniamara2024@vitstudent.ac.in' ? 'admin' : data.role;
            setUser({ uid: firebaseUser.uid, ...data, role } as UserProfile);
          } else {
            // Fallback for bootstrap admin email to ensure access
            if (firebaseUser.email === 'gayatri.pavaniamara2024@vitstudent.ac.in') {
              setUser({
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Admin',
                email: firebaseUser.email || '',
                role: 'admin',
              } as UserProfile);
            } else {
              setUser(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore user profile listener error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-brand-dark flex flex-col">
        {user && <Navbar user={user} />}
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />
            
            <Route path="/" element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" /> :
                user.role === 'officer' ? <Navigate to="/officer" /> :
                <CitizenReport user={user} />
              ) : <Navigate to="/login" />
            } />

            <Route path="/admin/*" element={
              user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/" />
            } />

            <Route path="/officer" element={
              user?.role === 'officer' ? <OfficerDashboard user={user} /> : <Navigate to="/" />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
