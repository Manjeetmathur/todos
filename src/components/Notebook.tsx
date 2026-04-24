import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import Page from './Page';

interface NotebookProps {
  user: User;
}

export interface JournalPage {
  id: string;
  pageNumber: number;
  theme: string;
  createdAt: any;
}

const THEMES = [
  { bg: 'bg-yellow-50', btn: 'bg-yellow-200' },
  { bg: 'bg-blue-50', btn: 'bg-blue-200' },
  { bg: 'bg-green-50', btn: 'bg-green-200' },
  { bg: 'bg-purple-50', btn: 'bg-purple-200' },
  { bg: 'bg-pink-50', btn: 'bg-pink-200' },
  { bg: 'bg-orange-50', btn: 'bg-orange-200' },
];

export default function Notebook({ user }: NotebookProps) {
  const [pages, setPages] = useState<JournalPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, `users/${user.uid}/pages`),
      orderBy('pageNumber', 'asc')
    );

    console.log('Notebook listener started for user', user.uid);
    isInitialLoad.current = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JournalPage[];
      console.log('Notebook snapshot received', fetchedPages.length, 'pages');
      
      setPages(fetchedPages);
      setLoading(false);

      if (isInitialLoad.current && fetchedPages.length > 0) {
        setCurrentPageIndex(fetchedPages.length - 1);
        isInitialLoad.current = false;
      }

      // If no pages exist, create the first one
      if (fetchedPages.length === 0) {
        createNewPage(1);
      }
    }, (snapshotError) => {
      const message = snapshotError instanceof Error ? snapshotError.message : String(snapshotError);
      console.error('Notebook snapshot error:', snapshotError);
      setError(`Failed to load notebook: ${message}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, reloadTrigger]);

  const createNewPage = async (pageNumber: number) => {
    try {
      const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)].bg;
      await addDoc(collection(db, `users/${user.uid}/pages`), {
        userId: user.uid,
        pageNumber,
        theme: randomTheme,
        createdAt: serverTimestamp()
      });
      setError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Create page error:', error);
      setError(`Could not create page: ${message}`);
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/pages`);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setDirection(1);
      setCurrentPageIndex(prev => prev + 1);
    } else {
      // Create a new page if at the end
      setDirection(1);
      createNewPage(pages.length + 1);
      // The snapshot listener will update the pages array, but we need to wait for it.
      // We'll optimistically move to the next index once it loads.
      setTimeout(() => {
        setCurrentPageIndex(pages.length);
      }, 300);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setDirection(-1);
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      rotateY: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      rotateY: direction > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.95,
    })
  };

  const changeTheme = async (newTheme: string) => {
    if (!currentPage) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `users/${user.uid}/pages`, currentPage.id), {
        theme: newTheme
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/pages/${currentPage.id}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl aspect-[3/4] sm:aspect-[4/3] bg-white rounded-r-3xl rounded-l-md shadow-xl border-l-8 border-gray-300 flex items-center justify-center">
        <div className="text-2xl font-handwriting text-gray-400 animate-pulse">Opening notebook...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl aspect-[3/4] sm:aspect-[4/3] bg-white rounded-r-3xl rounded-l-md shadow-xl border-l-8 border-gray-300 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-xl font-marker text-red-500">{error}</div>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            setPages([]);
            setCurrentPageIndex(0);
            setReloadTrigger(prev => prev + 1);
          }}
          className="px-5 py-3 bg-pink-400 text-white rounded-2xl text-lg font-handwriting hover:bg-pink-500 transition-colors"
        >
          Retry loading notebook
        </button>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex] || pages[pages.length - 1];

  if (!currentPage) {
    return (
      <div className="w-full max-w-4xl aspect-[3/4] sm:aspect-[4/3] bg-white rounded-r-3xl rounded-l-md shadow-xl border-l-8 border-gray-300 flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-2xl text-gray-500 font-handwriting">Creating your first notebook page...</div>
        <button
          onClick={() => createNewPage(1)}
          className="px-5 py-3 bg-pink-400 text-white rounded-2xl text-lg font-handwriting hover:bg-pink-500 transition-colors"
        >
          Create page now
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl flex-1 flex flex-col min-h-0 sm:aspect-[4/3] sm:flex-none sm:h-auto">
      {/* Theme Selector */}
      {/* <div className="absolute -top-9 sm:-top-12 right-1 sm:right-0 flex justify-end gap-1.5 sm:gap-2 z-20">
        {THEMES.map(theme => (
          <button
            key={theme.bg}
            onClick={() => changeTheme(theme.bg)}
            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-sm border-2 transition-transform hover:scale-110 ${theme.btn} ${currentPage.theme === theme.bg ? 'border-gray-600 scale-110' : 'border-white'}`}
            title="Change page color"
          />
        ))}
      </div> */}

      <div className="relative flex-1 w-full">
        {/* Notebook Cover/Binding effect */}
        <div className="absolute inset-0 bg-gray-800 rounded-r-3xl rounded-l-md shadow-2xl -z-10 translate-x-1 translate-y-1"></div>
        
        <div className="absolute inset-0 rounded-r-3xl rounded-l-md bg-white border-l-4 sm:border-l-8 border-gray-300 shadow-inner [perspective:2000px]">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentPage.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                rotateY: { type: "spring", stiffness: 120, damping: 20 },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
              onPanEnd={(e, info) => {
                const swipe = swipePower(info.offset.x, info.velocity.x);
                if (swipe < -swipeConfidenceThreshold) {
                  handleNextPage();
                } else if (swipe > swipeConfidenceThreshold) {
                  handlePrevPage();
                }
              }}
              style={{ touchAction: "pan-y", transformOrigin: "left center" }}
              className={`absolute inset-0 w-full h-full overflow-hidden rounded-r-3xl rounded-l-md ${currentPage.theme} transition-colors duration-500`}
            >
              <Page user={user} page={currentPage} onNextPage={handleNextPage} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Page Indicator */}
      <div className="absolute bottom-1 sm:-bottom-10 left-1/2 -translate-x-1/2 font-handwriting text-base sm:text-xl text-gray-600 z-10 px-3 py-0.5 rounded-full">
        Page {currentPageIndex + 1} of {pages.length}
      </div>
    </div>
  );
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};
