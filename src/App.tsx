import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from './firebase';
import Notebook from './components/Notebook';
import { LogIn, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <div className="text-2xl font-handwriting animate-pulse text-pink-400">Loading your journal...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-4 border-pink-200">
          <h1 className="text-5xl font-marker text-pink-500 mb-6">Comic Journal</h1>
          <p className="text-xl text-gray-600 mb-8 font-handwriting">Your cute, personal space to track your daily adventures!</p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-pink-400 hover:bg-pink-500 text-white text-2xl py-4 px-6 rounded-2xl transition-transform hover:scale-105 font-handwriting shadow-md"
          >
            <LogIn size={28} />
            Start Journaling
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-4xl flex justify-between items-center mb-10 sm:mb-6 px-1 sm:px-0">
        <h1 className="text-2xl sm:text-4xl font-marker text-pink-500">My Comic Journal</h1>
        <button
          onClick={logOut}
          className="flex items-center gap-1.5 text-pink-500 hover:text-pink-600 font-handwriting text-base sm:text-xl transition-colors bg-white/60 px-3 py-1 rounded-full sm:bg-transparent sm:px-0 sm:py-0 shadow-sm sm:shadow-none"
        >
          <LogOut size={16} className="sm:w-5 sm:h-5" />
          <span>Log Out</span>
        </button>
      </div>
      <Notebook user={user} />
    </div>
  );
}
