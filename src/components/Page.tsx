import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { JournalPage } from './Notebook';
import { CheckCircle2, Circle, Trash2, ArrowRight, Pencil, Check } from 'lucide-react';
import React from 'react';
interface PageProps {
  user: User;
  page: JournalPage;
  onNextPage: () => void;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: any;
}

export default function Page({ user, page, onNextPage }: PageProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, `users/${user.uid}/pages/${page.id}/todos`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTodos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      setTodos(fetchedTodos);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/pages/${page.id}/todos`);
    });

    return () => unsubscribe();
  }, [user.uid, page.id]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await addDoc(collection(db, `users/${user.uid}/pages/${page.id}/todos`), {
        userId: user.uid,
        pageId: page.id,
        text: newTodo.trim(),
        completed: false,
        createdAt: serverTimestamp()
      });
      setNewTodo('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/pages/${page.id}/todos`);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/pages/${page.id}/todos`, todo.id), {
        completed: !todo.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/pages/${page.id}/todos/${todo.id}`);
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/pages/${page.id}/todos`, todoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/pages/${page.id}/todos/${todoId}`);
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = async (todoId: string) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateDoc(doc(db, `users/${user.uid}/pages/${page.id}/todos`, todoId), {
        text: editText.trim()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/pages/${page.id}/todos/${todoId}`);
    }
  };

  const incompleteTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="h-full flex flex-col notebook-lines p-3 sm:p-6">
      {/* Top Half: Input and Date */}
      <div className="flex-none mb-2 sm:mb-4">
        <div className="flex justify-between items-end mb-2 sm:mb-4 border-b-2 border-pink-300 pb-2">
          <h2 className="text-2xl sm:text-3xl font-marker text-gray-800">Page {page.pageNumber}</h2>
          <span className="text-base sm:text-lg font-handwriting text-gray-500">
            {page.createdAt?.toDate ? page.createdAt.toDate().toLocaleDateString() : 'Today'}
          </span>
        </div>

        <form onSubmit={handleAddTodo} className="flex gap-2 sm:gap-4">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Write a new task or thought..."
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-lg sm:text-xl font-handwriting text-gray-800 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!newTodo.trim()}
            className="shrink-0 px-3 py-1 sm:px-4 sm:py-1.5 bg-pink-400 text-white rounded-full font-handwriting text-base sm:text-lg hover:bg-pink-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            Add
          </button>
        </form>
      </div>

      {/* Bottom Half: Lists */}
      <div className="flex-1 grid grid-rows-2 sm:grid-rows-1 sm:grid-cols-2 gap-3 sm:gap-4 min-h-0">
        
        {/* Incomplete List */}
        <div className="flex flex-col min-h-0 bg-white/40 rounded-2xl p-3 sm:p-4 shadow-sm border border-white/50 backdrop-blur-sm">
          <h3 className="text-xl sm:text-2xl font-marker text-pink-500 mb-1 sm:mb-2 flex items-center gap-2">
            <Circle size={20} className="text-pink-400" /> To Do
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-1 sm:space-y-2 custom-scrollbar">
            {incompleteTodos.length === 0 ? (
              <p className="text-gray-400 font-handwriting text-base sm:text-lg italic">Nothing to do yet!</p>
            ) : (
              incompleteTodos.map(todo => (
                <div key={todo.id} className="group flex items-start gap-2 sm:gap-3">
                  <button onClick={() => toggleTodo(todo)} className="mt-1 text-gray-400 hover:text-pink-500 transition-colors">
                    <Circle size={18} className="sm:w-5 sm:h-5" />
                  </button>
                  {editingId === todo.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(todo.id); }}
                        onBlur={() => saveEdit(todo.id)}
                        autoFocus
                        className="flex-1 bg-white/50 border-b border-pink-300 outline-none text-lg sm:text-xl font-handwriting text-gray-800 px-1 rounded-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-lg sm:text-xl font-handwriting text-gray-800 leading-tight">{todo.text}</span>
                      <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 flex gap-1 sm:gap-2 transition-opacity">
                        <button onClick={() => startEditing(todo)} className="text-blue-400 hover:text-blue-600 transition-colors">
                          <Pencil size={16} className="sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={() => deleteTodo(todo.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed List */}
        <div className="flex flex-col min-h-0 bg-white/40 rounded-2xl p-3 sm:p-4 shadow-sm border border-white/50 backdrop-blur-sm relative">
          <h3 className="text-xl sm:text-2xl font-marker text-green-500 mb-1 sm:mb-2 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-400" /> Done
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-1 sm:space-y-2 custom-scrollbar mb-10 sm:mb-12">
            {completedTodos.length === 0 ? (
              <p className="text-gray-400 font-handwriting text-base sm:text-lg italic">Tasks will appear here.</p>
            ) : (
              completedTodos.map(todo => (
                <div key={todo.id} className="group flex items-start gap-2 sm:gap-3">
                  <button onClick={() => toggleTodo(todo)} className="mt-1 text-green-500 hover:text-gray-400 transition-colors">
                    <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
                  </button>
                  {editingId === todo.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(todo.id); }}
                        onBlur={() => saveEdit(todo.id)}
                        autoFocus
                        className="flex-1 bg-white/50 border-b border-pink-300 outline-none text-lg sm:text-xl font-handwriting text-gray-800 px-1 rounded-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-lg sm:text-xl font-handwriting text-gray-500 line-through leading-tight">{todo.text}</span>
                      <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 flex gap-1 sm:gap-2 transition-opacity">
                        <button onClick={() => startEditing(todo)} className="text-blue-400 hover:text-blue-600 transition-colors">
                          <Pencil size={16} className="sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={() => deleteTodo(todo.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Next Page Button inside the completed box area at the bottom */}
          {/* <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4">
             <button
                onClick={onNextPage}
                className="flex items-center gap-1 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 bg-white rounded-full shadow-md text-pink-500 font-handwriting text-base sm:text-lg hover:bg-pink-50 transition-colors border border-pink-100"
              >
                Next Page <ArrowRight size={16} className="sm:w-4 sm:h-4" />
              </button>
          </div> */}
        </div>

      </div>
    </div>
  );
}
