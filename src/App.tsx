import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  BookOpen, 
  User, 
  Send, 
  Plus, 
  Sparkles, 
  BrainCircuit, 
  History, 
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Moon,
  Sun,
  Menu,
  X,
  ArrowLeft,
  Search,
  ArrowRight,
  Clock,
  Key,
  Upload,
  Instagram,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI, analyzeImage, generateQuiz, generateFlashcards, searchTopic, getTopicSuggestions } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface UserProfile {
  id: number;
  name: string;
  student_class: string;
  avatar: string | null;
  daily_credits: number;
  monthly_credits: number;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  image?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizResult {
  id: number;
  topic: string;
  score: number;
  total: number;
  date: string;
}

interface StudyNote {
  id: number;
  title: string;
  content: string;
  date: string;
}

interface PlannerTask {
  id: number;
  task: string;
  due_date: string;
  completed: boolean;
}

interface FlashcardData {
  explanation: string;
  flashcards: { question: string; answer: string }[];
}

const BrainLogo = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <div className={cn("bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600", className)}>
      <BrainCircuit className="w-[60%] h-[60%]" />
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'quiz' | 'portfolio' | 'profile' | 'planner' | 'flashcards' | 'about' | 'search' | 'pomodoro' | 'notes' | 'instagram'>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showQuizReminder, setShowQuizReminder] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);
  const [dashboardMode, setDashboardMode] = useState<'scroll' | 'slide'>('scroll');

  // Quick Notes state
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Pomodoro state
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quizFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Quiz state
  const [quizTopic, setQuizTopic] = useState('');
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [quizImage, setQuizImage] = useState<string | null>(null);

  // Portfolio state
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);

  // Profile state
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Planner state
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    // Format to YYYY-MM-DD for the input field
    const formattedDate = newDate.toISOString().split('T')[0];
    setNewDueDate(formattedDate);
  };

  // Flashcards state
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcardData, setFlashcardData] = useState<FlashcardData | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchPortfolio();
    fetchPlanner();
    fetchNotes();
    
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }

    const isOnboarded = localStorage.getItem('isOnboarded');
    if (!isOnboarded) {
      setShowOnboarding(true);
    }

    const lastQuizDate = localStorage.getItem('lastQuizDate');
    const today = new Date().toLocaleDateString();
    if (lastQuizDate !== today) {
      setShowQuizReminder(true);
    }
  }, []);

  useEffect(() => {
    if (isPomodoroActive) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 0) {
            clearInterval(pomodoroIntervalRef.current!);
            setIsPomodoroActive(false);
            const nextMode = pomodoroMode === 'work' ? 'break' : 'work';
            setPomodoroMode(nextMode);
            setPomodoroTime(nextMode === 'work' ? 25 * 60 : 5 * 60);
            alert(nextMode === 'work' ? "Break over! Time to focus." : "Great work! Take a 5-minute break.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    }
    return () => {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    };
  }, [isPomodoroActive, pomodoroMode]);

  useEffect(() => {
    if (user?.student_class) {
      fetchSuggestions();
    }
  }, [user?.student_class]);

  const fetchSuggestions = async () => {
    if (!user?.student_class) return;
    const suggestions = await getTopicSuggestions(user.student_class, selectedModel);
    setTopicSuggestions(suggestions);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (user && user.daily_credits < 10) {
      alert("Not enough credits! This feature requires 10 credits.");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    
    const success = await useCredits(10);
    if (!success) {
      setIsSearching(false);
      return;
    }

    try {
      const result = await searchTopic(searchQuery, selectedModel);
      setSearchResult(result);
    } catch (err) {
      console.error("Search error", err);
      setSearchResult("Failed to fetch notes. Please check your connection or API key.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (user && user.daily_credits <= 0) {
      const savedLock = localStorage.getItem('lockout_end');
      const now = Date.now();
      let lockTime: number;

      if (savedLock && parseInt(savedLock) > now) {
        lockTime = parseInt(savedLock);
      } else {
        lockTime = now + 12 * 60 * 60 * 1000;
        localStorage.setItem('lockout_end', lockTime.toString());
      }
      
      setLockedUntil(lockTime);
    } else {
      setLockedUntil(null);
      localStorage.removeItem('lockout_end');
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockedUntil) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((lockedUntil - now) / 1000));
        setLockoutTimeLeft(diff);
        if (diff <= 0) {
          setLockedUntil(null);
          localStorage.removeItem('lockout_end');
          fetchUser();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Instagram credit logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'instagram') {
      interval = setInterval(() => {
        useCredits(4);
      }, 60 * 60 * 1000); // 1 hour
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'portfolio') {
      fetchPortfolio();
    }
  }, [activeTab]);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      alert("File size exceeds 4.5MB limit.");
      return;
    }

    if (user && (user.daily_credits < 10 || user.monthly_credits < 10)) {
      alert("Insufficient credits! Avatar upload costs 10 credits.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64 })
        });
        if (res.ok) {
          fetchUser();
          alert("Avatar updated successfully! (10 credits used)");
        } else {
          const data = await res.json();
          alert(data.error || "Failed to upload avatar.");
        }
      } catch (err) {
        console.error("Avatar upload error", err);
        alert("An error occurred during upload.");
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      setEditName(data.name);
      setEditClass(data.student_class);
    } catch (err) {
      console.error("Failed to fetch user", err);
    } finally {
      setLoading(false);
    }
  };

  const useCredits = async (amount: number) => {
    try {
      const res = await fetch('/api/use-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, daily_credits: data.remaining } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to use credits", err);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    if (user && user.daily_credits < 2) {
      alert("Not enough credits! Credits reset daily.");
      return;
    }

    const userMessage: Message = { role: 'user', content: input, image: selectedImage || undefined };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsTyping(true);

    const success = await useCredits(2.4);
    if (!success) {
      setIsTyping(false);
      return;
    }

    try {
      let aiResponse = '';
      if (userMessage.image) {
        aiResponse = await analyzeImage(userMessage.image, userMessage.content || "Explain this image and ask me a question about it.", selectedModel);
      } else {
        aiResponse = await chatWithAI(userMessage.content, messages.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.content }] })), selectedModel);
      }
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
    } catch (err: any) {
      console.error("AI Error", err);
      setMessages(prev => [...prev, { role: 'ai', content: err.message || "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large! Please select an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const qRes = await fetch('/api/quiz-results');
      setQuizHistory(await qRes.json());
    } catch (err) {
      console.error("Failed to fetch portfolio", err);
    }
  };

  const fetchPlanner = async () => {
    try {
      const res = await fetch('/api/study-planner');
      const data = await res.json();
      setPlannerTasks(data);
    } catch (err) {
      console.error("Failed to fetch planner", err);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim() || !newDueDate) return;
    try {
      await fetch('/api/study-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: newTask, due_date: newDueDate })
      });
      setNewTask('');
      setNewDueDate('');
      fetchPlanner();
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const handleToggleTask = async (id: number, completed: boolean) => {
    try {
      await fetch(`/api/study-planner/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      });
      fetchPlanner();
    } catch (err) {
      console.error("Failed to toggle task", err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await fetch(`/api/study-planner/${id}`, {
        method: 'DELETE'
      });
      fetchPlanner();
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!flashcardTopic.trim()) return;
    setIsGeneratingFlashcards(true);
    setFlashcardData(null);
    setCurrentFlashcardIndex(0);
    setShowFlashcardAnswer(false);

    try {
      const data = await generateFlashcards(flashcardTopic, selectedModel);
      if (data) {
        setFlashcardData(data);
      }
    } catch (err) {
      console.error("Flashcard generation error", err);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleUpdateNote = async (id: number, title: string, content: string) => {
    // Removed study notes
  };

  const handleClearQuizHistory = async () => {
    if (!confirm("Are you sure you want to clear all quiz history?")) return;
    try {
      await fetch('/api/quiz-results', {
        method: 'DELETE'
      });
      fetchPortfolio();
    } catch (err) {
      console.error("Failed to clear quiz history", err);
    }
  };

  const handleStartQuiz = async () => {
    if (!quizTopic.trim() && !quizImage) return;
    setIsGeneratingQuiz(true);
    setQuiz(null);
    setQuizFinished(false);
    setQuizScore(0);
    setCurrentQuizIndex(0);
    setUserAnswers([]);

    try {
      const data = await generateQuiz(quizTopic, quizImage || undefined, selectedModel);
      if (data) {
        setQuiz(data);
        setQuizImage(null);
      }
    } catch (err) {
      console.error("Quiz generation error", err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (id: number) => {
    try {
      await fetch(`/api/quiz-results/${id}`, {
        method: 'DELETE'
      });
      fetchPortfolio();
    } catch (err) {
      console.error("Failed to delete quiz result", err);
    }
  };

  const handleAnswerQuiz = async (answer: string) => {
    if (!quiz) return;
    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    let newScore = quizScore;
    if (answer === quiz[currentQuizIndex].correctAnswer) {
      newScore += 1;
      setQuizScore(newScore);
    }

    if (currentQuizIndex + 1 < quiz.length) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
      localStorage.setItem('lastQuizDate', new Date().toLocaleDateString());
      setShowQuizReminder(false);
      // Save result to DB
      try {
        await fetch('/api/quiz-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: quizTopic, score: newScore, total: quiz.length })
        });
      } catch (err) {
        console.error("Failed to save quiz result", err);
      }
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNoteTitle, content: newNoteContent })
      });
      setNewNoteTitle('');
      setNewNoteContent('');
      setIsAddingNote(false);
      fetchNotes();
    } catch (err) {
      console.error("Failed to add note", err);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await fetch(`/api/notes/${id}`, {
        method: 'DELETE'
      });
      fetchNotes();
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, student_class: editClass })
      });
      if (res.ok) {
        await fetchUser();
      }
    } catch (err) {
      console.error("Profile save error", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "w-64 glass border-r flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrainLogo />
            <h1 className="text-xl font-display font-bold text-slate-800">EduGenie</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'home' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Layers className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'chat' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            AI Chatbot
          </button>
          <button 
            onClick={() => { setActiveTab('quiz'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'quiz' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <BookOpen className="w-5 h-5" />
            Smart Quizzes
          </button>
          <button 
            onClick={() => { setActiveTab('flashcards'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'flashcards' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Search className="w-5 h-5" />
            AI Flashcards
          </button>
          <button 
            onClick={() => { setActiveTab('planner'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'planner' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Calendar className="w-5 h-5" />
            Study Planner
          </button>
          <button 
            onClick={() => { setActiveTab('pomodoro'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'pomodoro' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Clock className="w-5 h-5" />
            Pomodoro Timer
          </button>
          <button 
            onClick={() => { setActiveTab('notes'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'notes' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Edit3 className="w-5 h-5" />
            Quick Notes
          </button>
          <button 
            onClick={() => { setActiveTab('instagram'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'instagram' ? "bg-pink-50 text-pink-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Instagram className="w-5 h-5" />
            INSTAGRAM BY FAIZAN
          </button>
          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settings</p>
          </div>
          <div className="px-4 py-2">
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
              <span className="text-xs font-bold text-slate-500 uppercase">Dashboard</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setDashboardMode('scroll')}
                  className={cn("px-2 py-1 text-[10px] font-bold rounded-lg transition-all", dashboardMode === 'scroll' ? "bg-indigo-600 text-white" : "text-slate-400")}
                >
                  Scroll
                </button>
                <button 
                  onClick={() => setDashboardMode('slide')}
                  className={cn("px-2 py-1 text-[10px] font-bold rounded-lg transition-all", dashboardMode === 'slide' ? "bg-indigo-600 text-white" : "text-slate-400")}
                >
                  Slide
                </button>
              </div>
            </div>
          </div>
          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Learning Records</p>
          </div>
          <button 
            onClick={() => { setActiveTab('portfolio'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'portfolio' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <History className="w-5 h-5" />
            Portfolio
          </button>
          <button 
            onClick={() => { setActiveTab('search'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'search' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Search className="w-5 h-5" />
            Smart Search
          </button>
          <button 
            onClick={() => { setActiveTab('about'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'about' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <AlertCircle className="w-5 h-5" />
            About EduGenie
          </button>
          <button 
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === 'profile' ? "bg-indigo-50 text-indigo-600 font-medium" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <User className="w-5 h-5" />
            Profile
          </button>
        </nav>

        <div className="p-4 m-4 bg-slate-900 rounded-2xl text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Daily Credits</span>
            <span className="text-xs font-bold text-indigo-400">{user?.daily_credits}/300</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(user?.daily_credits || 0) / 300 * 100}%` }}
              className="h-full bg-indigo-500"
            />
          </div>
          <p className="text-[10px] mt-2 text-slate-400">Monthly: {user?.monthly_credits.toLocaleString()} left</p>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 1, 
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]"
            >
              Made by
            </motion.div>
            <div className="flex overflow-hidden h-4">
              {"FAIZAN".split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: "easeOut"
                  }}
                  className="text-xs font-black text-blue-600 uppercase tracking-widest"
                >
                  {char}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 glass border-b flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            {activeTab !== 'home' && (
              <button 
                onClick={() => setActiveTab('home')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                title="Back to Home"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
            )}
            <div className="flex items-center gap-2 md:hidden">
               <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500">
                 <Menu className="w-6 h-6" />
               </button>
               <BrainLogo className="w-8 h-8" />
               <span className="font-display font-bold">EduGenie</span>
            </div>
            <div className="hidden md:block">
              <h2 className="font-display font-semibold text-slate-700">
                {activeTab === 'home' && 'Student Dashboard'}
                {activeTab === 'chat' && 'AI Learning Assistant'}
                {activeTab === 'quiz' && 'Knowledge Assessment'}
                {activeTab === 'flashcards' && 'AI Flashcards'}
                {activeTab === 'planner' && 'Study Planner'}
                {activeTab === 'portfolio' && 'Learning Portfolio'}
                {activeTab === 'search' && 'Smart Topic Search'}
                {activeTab === 'about' && 'About EduGenie'}
                {activeTab === 'profile' && 'Student Profile'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!hasApiKey && (
              <button 
                onClick={handleOpenKeyDialog}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                Set API Key
              </button>
            )}
            <div className="md:hidden flex flex-col items-end bg-slate-100 px-3 py-1 rounded-xl">
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                {user?.daily_credits}/300
              </div>
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                {user?.monthly_credits.toLocaleString()}/2M
              </div>
            </div>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name[0]
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-5xl mx-auto space-y-8 pb-20"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <BrainLogo className="w-12 h-12" />
                    <h1 className="text-4xl font-display font-bold text-slate-800 flex items-center gap-3">
                      Hello, {user?.name}! <span className="animate-bounce">👋</span>
                    </h1>
                  </div>
                  <p className="text-slate-500 text-lg">What would you like to learn today?</p>
                </div>

                <div className={cn(
                  dashboardMode === 'scroll' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
                    : "flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 pb-6"
                )}>
                  <div 
                    onClick={() => setActiveTab('search')}
                    className={cn(
                      "glass p-4 sm:p-6 rounded-3xl space-y-3 sm:space-y-4 card-hover group cursor-pointer border-2 border-indigo-500/20",
                      dashboardMode === 'slide' && "min-w-[260px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800">Smart Search</h3>
                      <p className="text-xs sm:text-sm text-slate-500">Get full notes and resources from Google Search (10 credits).</p>
                    </div>
                    <div className="flex items-center text-indigo-600 font-bold text-xs sm:text-sm">
                      Search now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('chat')}
                    className={cn(
                      "glass p-4 sm:p-6 rounded-3xl space-y-3 sm:space-y-4 card-hover group cursor-pointer",
                      dashboardMode === 'slide' && "min-w-[260px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800">AI Chatbot</h3>
                      <p className="text-xs sm:text-sm text-slate-500">Ask questions, get explanations, and explore topics.</p>
                    </div>
                    <div className="flex items-center text-indigo-600 font-bold text-xs sm:text-sm">
                      Try it now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('quiz')}
                    className={cn(
                      "glass p-4 sm:p-6 rounded-3xl space-y-3 sm:space-y-4 card-hover group cursor-pointer",
                      dashboardMode === 'slide' && "min-w-[260px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800">Smart Quizzes</h3>
                      <p className="text-xs sm:text-sm text-slate-500">Test your knowledge with AI-generated quizzes.</p>
                    </div>
                    <div className="flex items-center text-emerald-600 font-bold text-xs sm:text-sm">
                      Try it now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('flashcards')}
                    className={cn(
                      "glass p-5 sm:p-6 rounded-3xl space-y-4 card-hover group cursor-pointer",
                      dashboardMode === 'slide' && "min-w-[280px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-slate-800">AI Flashcards</h3>
                      <p className="text-sm text-slate-500">Search any topic for instant explanations and cards.</p>
                    </div>
                    <div className="flex items-center text-amber-600 font-bold text-sm">
                      Try it now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('planner')}
                    className={cn(
                      "glass p-5 sm:p-6 rounded-3xl space-y-4 card-hover group cursor-pointer",
                      dashboardMode === 'slide' && "min-w-[280px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-slate-800">Study Planner</h3>
                      <p className="text-sm text-slate-500">Organize your tasks and stay on top of your schedule.</p>
                    </div>
                    <div className="flex items-center text-rose-600 font-bold text-sm">
                      Try it now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('pomodoro')}
                    className={cn(
                      "glass p-5 sm:p-6 rounded-3xl space-y-4 card-hover group cursor-pointer",
                      dashboardMode === 'slide' && "min-w-[280px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-slate-800">Pomodoro Timer</h3>
                      <p className="text-sm text-slate-500">Boost productivity with focused work sessions.</p>
                    </div>
                    <div className="flex items-center text-orange-600 font-bold text-sm">
                      Try it now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                      "glass p-5 sm:p-6 rounded-3xl space-y-4 card-hover group cursor-pointer",
                      dashboardMode === 'slide' && "min-w-[280px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Edit3 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-slate-800">Quick Notes</h3>
                      <p className="text-sm text-slate-500">Capture ideas and study notes instantly.</p>
                    </div>
                    <div className="flex items-center text-blue-600 font-bold text-sm">
                      Try it now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('instagram')}
                    className={cn(
                      "glass p-5 sm:p-6 rounded-3xl space-y-4 card-hover group cursor-pointer border-2 border-pink-500/20",
                      dashboardMode === 'slide' && "min-w-[280px] sm:min-w-[320px] snap-center"
                    )}
                  >
                    <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-all">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-slate-800">Instagram</h3>
                      <p className="text-sm text-slate-500">Browse Instagram in-app (4 credits/hr).</p>
                    </div>
                    <div className="flex items-center text-pink-600 font-bold text-sm">
                      Open now <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>

                  <div 
                    onClick={() => setActiveTab('portfolio')}
                    className="glass p-5 sm:p-6 rounded-3xl space-y-4 card-hover group cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                      <History className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-slate-800">History</h3>
                      <p className="text-sm text-slate-500">Track your progress and review your quiz history.</p>
                    </div>
                    <div className="flex items-center text-violet-600 font-bold text-sm">
                      View history <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>

                {/* History Section */}
                <div className="glass rounded-3xl overflow-hidden">
                  <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" /> Learning History
                    </h3>
                    {quizHistory.length > 0 && (
                      <button 
                        onClick={handleClearQuizHistory}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="divide-y">
                    {quizHistory.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">No history yet. Start learning!</div>
                    ) : (
                      quizHistory.slice(0, 5).map((res) => (
                        <div key={res.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{res.topic}</p>
                              <p className="text-xs text-slate-400">{new Date(res.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-display font-bold text-indigo-600">{res.score}/{res.total}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Score</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteQuiz(res.id)}
                              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto h-full flex flex-col relative"
              >
                <div className="flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-24 scroll-smooth no-scrollbar">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <BrainLogo className="w-16 h-16 mx-auto" />
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-display font-bold text-slate-800">Hello, {user?.name}!</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                          I'm your EduGenie. Ask me anything about your studies, or upload a picture of a problem you're stuck on!
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                        <button onClick={() => setInput("Explain photosynthesis in simple terms")} className="p-4 glass rounded-2xl text-left hover:border-indigo-300 transition-all">
                          <p className="text-sm font-medium text-slate-700">Explain photosynthesis</p>
                          <p className="text-xs text-slate-400">Science • 10th Grade</p>
                        </button>
                        <button onClick={() => setInput("Give me a math problem about quadratic equations")} className="p-4 glass rounded-2xl text-left hover:border-indigo-300 transition-all">
                          <p className="text-sm font-medium text-slate-700">Quadratic equations</p>
                          <p className="text-xs text-slate-400">Math • Algebra</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-3",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                      )}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "max-w-[85%] p-4 rounded-3xl",
                        msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "glass rounded-tl-none shadow-sm"
                      )}>
                        {msg.image && (
                          <div className="mb-3 overflow-hidden rounded-xl border border-white/20 shadow-lg">
                            <img src={msg.image} alt="Uploaded" className="max-w-full h-auto" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      </div>
                      <div className="glass p-4 rounded-3xl rounded-tl-none">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent z-10">
                  <div className="max-w-4xl mx-auto space-y-3">
                    {/* Topic Suggestions */}
                    {messages.length === 0 && topicSuggestions.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Suggestions:</span>
                        {topicSuggestions.map((topic, i) => (
                          <button 
                            key={i}
                            onClick={() => setInput(`Tell me more about ${topic}`)}
                            className="px-3 py-1 bg-white/50 backdrop-blur-sm text-blue-600 rounded-full text-xs whitespace-nowrap hover:bg-white transition-all border border-slate-200"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="glass rounded-[32px] p-2 shadow-2xl border-blue-500/20">
                      {selectedImage && (
                        <div className="p-2 relative inline-block">
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="relative"
                          >
                            <img 
                              src={selectedImage} 
                              className="h-24 w-24 object-cover rounded-2xl border-2 border-blue-500 shadow-lg" 
                            />
                            <div className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded-lg text-[10px] space-y-1">
                              <div>Credits: {user?.daily_credits}</div>
                              <div>Time: {currentTime.toLocaleTimeString()}</div>
                              <div>Scroll: {Math.round(scrollPosition)}</div>
                            </div>
                            <button 
                              onClick={() => setSelectedImage(null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 px-2">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 text-slate-400 hover:text-blue-600 transition-colors rounded-2xl hover:bg-blue-50"
                        >
                          <Camera className="w-6 h-6" />
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <input 
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask EduGenie anything..."
                          className="flex-1 bg-transparent border-none focus:ring-0 py-4 px-2 text-slate-800 placeholder-slate-400 font-medium"
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={(!input.trim() && !selectedImage) || isTyping}
                          className={cn(
                            "p-3 rounded-2xl transition-all shadow-lg active:scale-95",
                            input.trim() || selectedImage 
                              ? "bg-blue-600 text-white shadow-blue-500/30" 
                              : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>

                    {/* Quick Features at Bottom */}
                    <div className="flex items-center justify-center gap-6 pt-2">
                      <button onClick={() => setActiveTab('quiz')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all group">
                        <BookOpen className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quiz</span>
                      </button>
                      <button onClick={() => setActiveTab('flashcards')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-all group">
                        <Search className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cards</span>
                      </button>
                      <button onClick={() => setActiveTab('planner')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-all group">
                        <Calendar className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'quiz' && (
              <motion.div 
                key="quiz"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-8 pb-20"
              >
                {!quiz ? (
                  <div className="glass p-12 rounded-[40px] text-center space-y-8 max-w-2xl mx-auto mt-10">
                    <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto shadow-xl shadow-emerald-500/10">
                      <BookOpen className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-bold text-slate-800">Smart Quiz Generator</h3>
                      <p className="text-slate-500 text-lg">Enter a topic and AI will generate a personalized quiz for you.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      {quizImage && (
                        <div className="relative inline-block mx-auto">
                          <img src={quizImage} className="h-32 w-32 object-cover rounded-2xl border-2 border-indigo-500" />
                          <button 
                            onClick={() => setQuizImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                          <input 
                            value={quizTopic}
                            onChange={(e) => setQuizTopic(e.target.value)}
                            placeholder="Enter a topic or upload image..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-6 pr-12 py-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <button 
                            onClick={() => quizFileInputRef.current?.click()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                          <input 
                            type="file" 
                            ref={quizFileInputRef} 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setQuizImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                        <button 
                          onClick={handleStartQuiz}
                          disabled={(!quizTopic.trim() && !quizImage) || isGeneratingQuiz}
                          className="btn-primary flex items-center justify-center gap-2 px-8 py-4"
                        >
                          {isGeneratingQuiz ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                ) : quizFinished ? (
                  <div className="glass p-10 rounded-3xl space-y-8">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
                        <CheckCircle2 className="w-16 h-16" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-display font-bold text-slate-800">Quiz Complete!</h3>
                        <p className="text-slate-500 text-lg">You scored {quizScore} out of {quiz.length}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-700 border-b pb-2">Review Answers</h4>
                      {quiz.map((q, i) => (
                        <div key={i} className={cn(
                          "p-4 rounded-2xl border",
                          userAnswers[i] === q.correctAnswer ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                        )}>
                          <p className="font-medium text-slate-800 mb-2">{i + 1}. {q.question}</p>
                          <div className="flex flex-col gap-1 text-sm">
                            <p className={cn(
                              "font-semibold",
                              userAnswers[i] === q.correctAnswer ? "text-green-700" : "text-red-700"
                            )}>
                              Your Answer: {userAnswers[i]}
                            </p>
                            {userAnswers[i] !== q.correctAnswer && (
                              <p className="text-green-700 font-semibold">Correct Answer: {q.correctAnswer}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center gap-4 pt-4">
                      <button onClick={() => setQuiz(null)} className="btn-secondary">Try Another Topic</button>
                      <button onClick={handleStartQuiz} className="btn-primary">Retake Quiz</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question {currentQuizIndex + 1} of {quiz.length}</span>
                        <span className="text-sm font-bold text-indigo-600">{Math.round((currentQuizIndex / quiz.length) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${(currentQuizIndex / quiz.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="glass p-8 rounded-3xl space-y-8">
                      <h3 className="text-xl font-display font-bold text-slate-800 leading-relaxed">
                        {quiz[currentQuizIndex].question}
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {quiz[currentQuizIndex].options.map((option, i) => (
                          <button 
                            key={i}
                            onClick={() => handleAnswerQuiz(option)}
                            className="p-4 text-left glass rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group flex items-center justify-between"
                          >
                            <span className="text-slate-700 font-medium">{option}</span>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'flashcards' && (
              <motion.div 
                key="flashcards"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-8 pb-20"
              >
                {!flashcardData ? (
                  <div className="glass p-12 rounded-[40px] text-center space-y-8 max-w-2xl mx-auto mt-10">
                    <div className="w-24 h-24 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 mx-auto shadow-xl shadow-amber-500/10">
                      <Search className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-bold text-slate-800">AI Flashcards</h3>
                      <p className="text-slate-500 text-lg">Search any topic to get a clear explanation and interactive cards.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        value={flashcardTopic}
                        onChange={(e) => setFlashcardTopic(e.target.value)}
                        placeholder="e.g. Quantum Physics, French Verbs..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button 
                        onClick={handleGenerateFlashcards}
                        disabled={!flashcardTopic.trim() || isGeneratingFlashcards}
                        className="btn-primary flex items-center justify-center gap-2 px-8"
                      >
                        {isGeneratingFlashcards ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        Search
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="glass p-8 rounded-3xl space-y-4">
                      <h3 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-600" /> Explanation
                      </h3>
                      <div className="prose max-w-none text-slate-600 leading-relaxed">
                        {flashcardData.explanation}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-display font-bold text-slate-800">Interactive Cards</h3>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Card {currentFlashcardIndex + 1} of {flashcardData.flashcards.length}</span>
                      </div>

                      <div className="perspective-1000 h-80 w-full max-w-lg mx-auto">
                        <motion.div 
                          onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
                          animate={{ rotateY: showFlashcardAnswer ? 180 : 0 }}
                          transition={{ duration: 0.6, type: 'spring' }}
                          className="relative w-full h-full cursor-pointer preserve-3d"
                        >
                          {/* Front */}
                          <div className="absolute inset-0 glass rounded-[40px] flex flex-col items-center justify-center p-10 text-center backface-hidden shadow-2xl">
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Question</p>
                            <h4 className="text-2xl font-display font-bold text-slate-800">{flashcardData.flashcards[currentFlashcardIndex].question}</h4>
                            <p className="mt-8 text-slate-400 text-sm animate-pulse">Click to flip</p>
                          </div>
                          {/* Back */}
                          <div className="absolute inset-0 glass rounded-[40px] flex flex-col items-center justify-center p-10 text-center backface-hidden rotate-y-180 shadow-2xl bg-indigo-50">
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Answer</p>
                            <p className="text-xl text-slate-700 leading-relaxed">{flashcardData.flashcards[currentFlashcardIndex].answer}</p>
                            <p className="mt-8 text-slate-400 text-sm">Click to flip back</p>
                          </div>
                        </motion.div>
                      </div>

                      <div className="flex justify-center gap-4">
                        <button 
                          disabled={currentFlashcardIndex === 0}
                          onClick={() => { setCurrentFlashcardIndex(prev => prev - 1); setShowFlashcardAnswer(false); }}
                          className="p-4 glass rounded-2xl disabled:opacity-30"
                        >
                          <ArrowRight className="w-6 h-6 rotate-180" />
                        </button>
                        <button 
                          disabled={currentFlashcardIndex === flashcardData.flashcards.length - 1}
                          onClick={() => { setCurrentFlashcardIndex(prev => prev + 1); setShowFlashcardAnswer(false); }}
                          className="p-4 glass rounded-2xl disabled:opacity-30"
                        >
                          <ArrowRight className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="text-center">
                        <button onClick={() => setFlashcardData(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
                          Search Different Topic
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'planner' && (
              <motion.div 
                key="planner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8 pb-20"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar View */}
                  <div className="glass p-8 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-600" /> Calendar
                      </h3>
                      <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <span className="font-bold text-slate-700 w-32 text-center">
                          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 text-center mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                        <div key={`empty-${i}`} className="p-2" />
                      ))}
                      {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                        const day = i + 1;
                        // Format date string safely considering local timezone
                        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const hasTasks = plannerTasks.some(t => t.due_date === dateStr && !t.completed);
                        const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth.getMonth() && selectedDate?.getFullYear() === currentMonth.getFullYear();
                        const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                        
                        return (
                          <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={cn(
                              "p-2 rounded-xl text-sm font-medium transition-all relative min-h-[40px]",
                              isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : 
                              isToday ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700",
                            )}
                          >
                            {day}
                            {hasTasks && (
                              <span className={cn(
                                "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                                isSelected ? "bg-white" : "bg-indigo-500"
                              )} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Task Form */}
                  <div className="glass p-8 rounded-3xl space-y-6">
                    <h3 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
                      <Plus className="w-6 h-6 text-indigo-600" /> Add New Task
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Task Description</label>
                        <input 
                          value={newTask}
                          onChange={(e) => setNewTask(e.target.value)}
                          placeholder="e.g. Finish History Assignment"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                        <input 
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <button onClick={handleAddTask} className="w-full btn-primary flex items-center justify-center gap-2 py-4 mt-4">
                        <Plus className="w-5 h-5" /> Add to Planner
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-3xl overflow-hidden">
                  <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-display font-bold text-slate-800">Upcoming Tasks</h3>
                    <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">
                      {plannerTasks.filter(t => !t.completed).length} Pending
                    </span>
                  </div>
                  <div className="divide-y">
                    {plannerTasks.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">Your planner is empty. Add some tasks to get started!</div>
                    ) : (
                      plannerTasks.map((task) => (
                        <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleToggleTask(task.id, task.completed)}
                              className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-500"
                              )}
                            >
                              {task.completed && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            <div>
                              <p className={cn(
                                "font-bold transition-all",
                                task.completed ? "text-slate-400 line-through" : "text-slate-700"
                              )}>
                                {task.task}
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due: {task.due_date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!task.completed && (
                              <button 
                                onClick={() => handleToggleTask(task.id, false)}
                                className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg hover:bg-emerald-100 transition-all opacity-0 group-hover:opacity-100"
                              >
                                Complete
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete task"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'search' && (
              <motion.div 
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8 pb-20"
              >
                <div className="glass p-8 rounded-[40px] space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-display font-bold text-slate-800 flex items-center gap-3">
                        <Search className="w-8 h-8 text-indigo-600" /> Smart Topic Search
                      </h3>
                      <p className="text-slate-500">Get comprehensive notes and resources from Google Search.</p>
                    </div>
                    <div className="bg-amber-100 text-amber-600 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border border-amber-200">
                      <AlertCircle className="w-4 h-4" />
                      Uses 10 Credits
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <input 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Enter any topic (e.g. Quantum Computing, French Revolution)..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={handleSearch}
                      disabled={!searchQuery.trim() || isSearching}
                      className="btn-primary px-8 flex items-center gap-2"
                    >
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      Search
                    </button>
                  </div>
                </div>

                {searchResult && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-8 rounded-[40px] space-y-6"
                  >
                    <div className="prose max-w-none">
                      <ReactMarkdown>{searchResult}</ReactMarkdown>
                    </div>
                    <div className="pt-6 border-t flex justify-end">
                      <button 
                        onClick={() => {
                          const blob = new Blob([searchResult], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${searchQuery.replace(/\s+/g, '_')}_notes.md`;
                          a.click();
                        }}
                        className="text-indigo-600 font-bold text-sm hover:underline"
                      >
                        Download as Markdown
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
            {activeTab === 'pomodoro' && (
              <motion.div 
                key="pomodoro"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl mx-auto h-full flex flex-col items-center justify-center space-y-8"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-display font-bold text-slate-800">
                    {pomodoroMode === 'work' ? 'Focus Session' : 'Break Time'}
                  </h2>
                  <p className="text-slate-500">
                    {pomodoroMode === 'work' ? 'Stay focused and avoid distractions.' : 'Relax and recharge for the next session.'}
                  </p>
                </div>

                <div className="relative w-64 h-64 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle 
                      cx="128" cy="128" r="120" 
                      fill="none" stroke="currentColor" strokeWidth="8" 
                      className="text-slate-100"
                    />
                    <motion.circle 
                      cx="128" cy="128" r="120" 
                      fill="none" stroke="currentColor" strokeWidth="8" 
                      strokeDasharray="754"
                      animate={{ strokeDashoffset: 754 - (754 * pomodoroTime) / (pomodoroMode === 'work' ? 25 * 60 : 5 * 60) }}
                      className="text-blue-600"
                    />
                  </svg>
                  <div className="flex flex-col items-center">
                    <input 
                      type="number"
                      value={Math.floor(pomodoroTime / 60)}
                      onChange={(e) => {
                        const mins = Math.max(1, Math.min(120, parseInt(e.target.value) || 1));
                        setPomodoroTime(mins * 60);
                      }}
                      disabled={isPomodoroActive}
                      className="w-24 bg-transparent text-6xl font-display font-bold text-slate-800 text-center outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
                    />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Minutes</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsPomodoroActive(!isPomodoroActive)}
                    className="btn-primary px-8 py-4 text-lg flex items-center gap-2"
                  >
                    {isPomodoroActive ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {isPomodoroActive ? 'Pause' : 'Start'}
                  </button>
                  <button 
                    onClick={() => {
                      setIsPomodoroActive(false);
                      setPomodoroTime(pomodoroMode === 'work' ? 25 * 60 : 5 * 60);
                    }}
                    className="btn-secondary px-8 py-4 text-lg"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div 
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8 pb-20"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-display font-bold text-slate-800">Quick Notes</h2>
                    <p className="text-slate-500">Jot down important points during your study sessions.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingNote(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> New Note
                  </button>
                </div>

                {isAddingNote && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass p-8 rounded-3xl space-y-6"
                  >
                    <div className="space-y-4">
                      <input 
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        placeholder="Note Title"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <textarea 
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Start typing your note..."
                        rows={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setIsAddingNote(false)} className="btn-secondary">Cancel</button>
                      <button onClick={handleAddNote} className="btn-primary">Save Note</button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {notes.length === 0 ? (
                    <div className="col-span-full p-20 text-center text-slate-400">No notes yet. Create your first study note!</div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="glass p-6 rounded-3xl space-y-4 group relative">
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="space-y-2">
                          <h4 className="text-xl font-display font-bold text-slate-800">{note.title}</h4>
                          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{note.date}</p>
                        </div>
                        <p className="text-slate-600 line-clamp-4 leading-relaxed">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'portfolio' && (
              <motion.div 
                key="portfolio"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-8 pb-20 overflow-y-auto no-scrollbar h-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass p-6 rounded-3xl text-center border-b-4 border-blue-500 card-hover">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Quizzes Taken</p>
                    <p className="text-4xl font-display font-bold text-slate-800">{quizHistory.length}</p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-bold text-blue-500 uppercase">
                      <Clock className="w-3 h-3" /> Updated just now
                    </div>
                  </div>
                  <div className="glass p-6 rounded-3xl text-center border-b-4 border-emerald-500 card-hover">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Avg. Score</p>
                    <p className="text-4xl font-display font-bold text-emerald-600">
                      {quizHistory.length > 0 
                        ? Math.round(quizHistory.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / quizHistory.length * 100)
                        : 0}%
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-500 uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Mastery Level: High
                    </div>
                  </div>
                  <div className="glass p-6 rounded-3xl text-center border-b-4 border-amber-500 card-hover">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Study Streak</p>
                    <p className="text-4xl font-display font-bold text-amber-600">
                      {quizHistory.length > 0 ? "🔥 5" : "0"}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-500 uppercase">
                      <Sparkles className="w-3 h-3" /> Keep it up!
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass rounded-3xl overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" /> Recent Quiz History
                      </h3>
                      {quizHistory.length > 0 && (
                        <button 
                          onClick={handleClearQuizHistory}
                          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="divide-y">
                      {quizHistory.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">No quiz history yet.</div>
                      ) : (
                        quizHistory.map((res) => (
                          <div key={res.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-sm">{res.topic}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{new Date(res.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-display font-bold text-blue-600">{res.score}/{res.total}</p>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="h-full bg-blue-500" 
                                    style={{ width: `${(res.score / res.total) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDeleteQuiz(res.id)}
                                className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="glass p-6 rounded-3xl space-y-4">
                      <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" /> Learning Insights
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Top Subject</p>
                          <p className="text-sm font-bold text-slate-700">Mathematics & Science</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Weakest Area</p>
                          <p className="text-sm font-bold text-slate-700">History & Dates</p>
                        </div>
                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Recommended Focus</p>
                          <p className="text-sm font-bold text-slate-700">Review Flashcards daily</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div 
                key="about"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-3xl mx-auto space-y-8 pb-20"
              >
                <div className="glass p-10 rounded-[40px] text-center space-y-8">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-indigo-500/40 rotate-12">
                    <Sparkles className="w-12 h-12" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-display font-bold text-slate-800">About EduGenie</h2>
                    <p className="text-slate-500 text-lg leading-relaxed">
                      EduGenie is your personal AI-powered study companion, designed to make learning more interactive, efficient, and fun.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                      <h4 className="font-bold text-indigo-600">AI Chatbot</h4>
                      <p className="text-sm text-slate-500">Instant answers and deep explanations for any academic query.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                      <h4 className="font-bold text-emerald-600">Smart Quizzes</h4>
                      <p className="text-sm text-slate-500">Personalized assessments generated from topics or images.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                      <h4 className="font-bold text-amber-600">AI Flashcards</h4>
                      <p className="text-sm text-slate-500">Interactive flip-cards to help you memorize key concepts.</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                      <h4 className="font-bold text-rose-600">Study Planner</h4>
                      <p className="text-sm text-slate-500">Keep track of your assignments and deadlines effortlessly.</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-left space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 font-bold">
                        <AlertCircle className="w-5 h-5" />
                        <span>Quota Exceeded?</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        If you encounter "Quota Exceeded" errors, it means the free shared API key has reached its limit. 
                        You can get your own <strong>FREE</strong> API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline font-bold">Google AI Studio</a>.
                      </p>
                      <p className="text-sm text-slate-600">
                        Once you have your key, click the <strong>Key icon</strong> in the menu to set it. This app supports all Gemini models (Pro, Flash, etc.) via your personal key.
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <p className="text-slate-400 font-medium">
                        Made with ❤️ by <span className="text-indigo-600 font-bold">Faizan</span>
                      </p>
                      <button 
                        onClick={handleOpenKeyDialog}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
                      >
                        <Key className="w-4 h-4" />
                        {hasApiKey ? 'Update API Key' : 'Set Personal API Key'}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span>Powered by Gemini 3.1 Pro & Flash Lite</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>Google Search Integrated</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'instagram' && (
              <motion.div 
                key="instagram"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col space-y-4"
              >
                <div className="glass p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-slate-800">INSTAGRAM BY FAIZAN</h3>
                      <p className="text-xs text-slate-500">Browsing Instagram (4 credits/hr)</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    In-App Browser
                  </div>
                </div>
                <div className="flex-1 glass rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 bg-pink-100 rounded-3xl flex items-center justify-center text-pink-600 mb-6 shadow-xl shadow-pink-500/20">
                    <Instagram className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Instagram Access</h2>
                  <p className="text-slate-500 mb-8 max-w-md text-lg leading-relaxed">
                    For security and privacy reasons, Instagram does not allow itself to be embedded directly inside other applications. 
                    <br/><br/>
                    You can open it securely in a new tab. Your session credits will still be tracked while this tab is active.
                  </p>
                  <button 
                    onClick={() => window.open('https://www.instagram.com', '_blank')}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 px-8 py-4 rounded-2xl font-bold text-white flex items-center gap-3 shadow-lg shadow-pink-500/30 transition-all transform hover:scale-105 active:scale-95"
                  >
                    <Instagram className="w-6 h-6" />
                    Launch Instagram Securely
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-2 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
                    External Browser Mode
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-xl mx-auto py-10"
              >
                <div className="glass rounded-3xl overflow-hidden">
                  <div className="h-32 bg-indigo-600 relative">
                    <div className="absolute -bottom-12 left-8">
                      <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-lg relative group">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <div className="w-full h-full bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-4xl font-bold">
                            {user?.name[0]}
                          </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                          <Camera className="w-8 h-8 text-white" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="pt-16 p-8 space-y-8">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span>Profile Settings</span>
                      <span className="text-indigo-600">Avatar Upload: 10 Credits</span>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Grade / Class</label>
                        <input 
                          value={editClass}
                          onChange={(e) => setEditClass(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Daily Credits</p>
                        <p className="text-2xl font-display font-bold text-slate-800">{user?.daily_credits}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Monthly Credits</p>
                        <p className="text-2xl font-display font-bold text-slate-800">{user?.monthly_credits.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">AI Model Settings</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Best Reasoning)', icon: <BrainCircuit className="w-4 h-4" /> },
                          { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Balanced)', icon: <Zap className="w-4 h-4" /> },
                          { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite (Fastest)', icon: <Sparkles className="w-4 h-4" /> },
                          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', icon: <Zap className="w-4 h-4" /> },
                          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Free)', icon: <Zap className="w-4 h-4" /> }
                        ].map((model) => (
                          <button 
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                              selectedModel === model.id 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                                : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {model.icon}
                            <span className="text-sm font-medium">{model.name}</span>
                            {selectedModel === model.id && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-4"
                    >
                      {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                      Update Profile
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Lockout Screen */}
      <AnimatePresence>
        {lockedUntil && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full text-center space-y-8"
            >
              <div className="w-24 h-24 bg-red-600 rounded-[32px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-red-500/40 animate-pulse">
                <Clock className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-display font-bold text-white tracking-tight">App Locked</h2>
                <p className="text-slate-400 text-lg">You've run out of credits. Please wait for the next refresh.</p>
                <div className="text-6xl font-display font-bold text-blue-500 py-6">
                  {Math.floor(lockoutTimeLeft / 3600)}h {Math.floor((lockoutTimeLeft % 3600) / 60)}m {lockoutTimeLeft % 60}s
                </div>
                <div className="p-6 bg-white/5 rounded-[32px] border border-white/10">
                  <p className="text-2xl font-display font-bold text-white italic">"Best wishes for study"</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="glass max-w-md w-full rounded-[40px] p-8 space-y-8 shadow-2xl"
            >
              <div className="text-center space-y-4">
                <BrainLogo className="w-20 h-20 mx-auto shadow-2xl shadow-blue-500/30" />
                <h2 className="text-3xl font-display font-bold text-slate-800">Welcome, Student!</h2>
                <p className="text-slate-500">Let's set up your profile to personalize your learning experience.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Full Name</label>
                  <input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Class/Grade</label>
                  <input 
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    placeholder="e.g. 10th Grade, College Freshman"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!editName.trim() || !editClass.trim()) {
                    alert("Please fill in all fields.");
                    return;
                  }
                  await handleSaveProfile();
                  localStorage.setItem('isOnboarded', 'true');
                  setShowOnboarding(false);
                }}
                className="w-full btn-primary py-4 text-lg"
              >
                Start Learning
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-lg w-full rounded-[40px] p-8 space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              <button 
                onClick={() => { setShowWelcome(false); localStorage.setItem('hasSeenWelcome', 'true'); }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-500/30 rotate-6">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-800">Welcome to EduGenie!</h2>
                <p className="text-slate-500">Your personal AI tutor is ready to help you excel.</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700">Personal API Keys</h4>
                    <p className="text-sm text-slate-500">Avoid "Quota Exceeded" errors by setting your own free Gemini API key in the settings.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700">Smart Search</h4>
                    <p className="text-sm text-slate-500">Get comprehensive notes from Google Search for any topic (10 credits per search).</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4" /> Important
                </div>
                <p className="text-xs text-slate-600">
                  If the app stops responding, it's likely a quota limit. Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 underline">aistudio.google.com</a>.
                </p>
              </div>

              <button 
                onClick={() => { setShowWelcome(false); localStorage.setItem('hasSeenWelcome', 'true'); }}
                className="w-full btn-primary py-4 text-lg"
              >
                Let's Get Started!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Reminder Modal */}
      <AnimatePresence>
        {showQuizReminder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-sm w-full rounded-[40px] p-8 space-y-6 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-500/30">
                <BookOpen className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-800">Time for a Quiz!</h2>
              <p className="text-slate-500">Keep your knowledge sharp! Take a quick quiz to stay on top of your studies.</p>
              <button 
                onClick={() => { setShowQuizReminder(false); setActiveTab('quiz'); }}
                className="btn-primary w-full py-4"
              >
                Take Quiz Now
              </button>
              <button 
                onClick={() => setShowQuizReminder(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium"
              >
                Maybe later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t flex items-center justify-around p-4 z-20">
        <button onClick={() => setActiveTab('home')} className={cn("p-2 rounded-xl", activeTab === 'home' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}>
          <Layers className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('chat')} className={cn("p-2 rounded-xl", activeTab === 'chat' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}>
          <MessageSquare className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('quiz')} className={cn("p-2 rounded-xl", activeTab === 'quiz' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}>
          <BookOpen className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('portfolio')} className={cn("p-2 rounded-xl", activeTab === 'portfolio' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}>
          <History className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('profile')} className={cn("p-2 rounded-xl", activeTab === 'profile' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}>
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
