
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Clock, 
  LayoutDashboard, 
  Lightbulb, 
  MessageSquare, 
  Plus, 
  Trash2,
  ExternalLink,
  ChevronRight,
  Link as LinkIcon,
  StickyNote,
  X,
  Heart,
  BookOpen,
  Save,
  ChevronLeft,
  Library,
  Scissors,
  Minus,
  FolderPlus,
  ArrowRight,
  Settings,
  User,
  ShieldCheck,
  Globe,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  History,
  RotateCcw
} from 'lucide-react';
import { Task, Category, Priority, Status, QuickNote, JournalEntry, Link, LinkGroup, ClassCut, CalendarAccount } from './types';
import { CATEGORY_COLORS, PRIORITY_COLORS, STATUS_COLORS } from './constants';
import { getTaskInsights } from './geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planner' | 'insights' | 'calendar' | 'journal' | 'vault'>('planner');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [linkGroups, setLinkGroups] = useState<LinkGroup[]>([]);
  const [classCuts, setClassCuts] = useState<ClassCut[]>([]);
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([
    { id: 'default', email: 'Primary Account', calendarId: 'primary', accountIndex: 0, isActive: true }
  ]);
  
  const [newNote, setNewNote] = useState('');
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Section Expansion State
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Form states for Vault
  const [newGroupName, setNewGroupName] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newMaxCuts, setNewMaxCuts] = useState(3);

  // Calendar Management State
  const [isManagingCalendars, setIsManagingCalendars] = useState(false);
  const [newCalEmail, setNewCalEmail] = useState('');
  const [newCalId, setNewCalId] = useState('primary');
  const [newCalIndex, setNewCalIndex] = useState(0);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<Category>(Category.ACADEMICS);
  const [taskPriority, setTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [taskStatus, setTaskStatus] = useState<Status>(Status.PENDING);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskRemarks, setTaskRemarks] = useState('');
  const [taskLink, setTaskLink] = useState('');

  // Journal State
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split('T')[0],
    title: '',
    content: ''
  });

  // Hydrate state from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('zen_tasks');
    const savedNotes = localStorage.getItem('zen_notes');
    const savedJournal = localStorage.getItem('zen_journal');
    const savedLinks = localStorage.getItem('zen_links');
    const savedGroups = localStorage.getItem('zen_link_groups');
    const savedCuts = localStorage.getItem('zen_class_cuts');
    const savedCalAccounts = localStorage.getItem('zen_cal_accounts');

    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
    if (savedLinks) setLinks(JSON.parse(savedLinks));
    if (savedGroups) setLinkGroups(JSON.parse(savedGroups));
    if (savedCuts) setClassCuts(JSON.parse(savedCuts));
    if (savedCalAccounts) setCalendarAccounts(JSON.parse(savedCalAccounts));

    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Persistence Effects
  useEffect(() => localStorage.setItem('zen_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('zen_notes', JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem('zen_journal', JSON.stringify(journalEntries)), [journalEntries]);
  useEffect(() => localStorage.setItem('zen_links', JSON.stringify(links)), [links]);
  useEffect(() => localStorage.setItem('zen_link_groups', JSON.stringify(linkGroups)), [linkGroups]);
  useEffect(() => localStorage.setItem('zen_class_cuts', JSON.stringify(classCuts)), [classCuts]);
  useEffect(() => localStorage.setItem('zen_cal_accounts', JSON.stringify(calendarAccounts)), [calendarAccounts]);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Notification Logic
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  };

  const checkDueDeliverables = useCallback(() => {
    if (Notification.permission !== "granted") return;

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const lastAlertDate = localStorage.getItem('zen_last_alert_date');

    // Only alert once per day automatically
    if (lastAlertDate === todayStr) return;

    const dueToday = tasks.filter(t => t.dueDate === todayStr && t.status !== Status.FINISHED);

    if (dueToday.length > 0) {
      new Notification("Deliverables Due Today!", {
        body: `You have ${dueToday.length} task(s) due today: ${dueToday.slice(0, 2).map(t => t.title).join(', ')}${dueToday.length > 2 ? '...' : ''}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
      });
      localStorage.setItem('zen_last_alert_date', todayStr);
    }
  }, [tasks]);

  useEffect(() => {
    // Check shortly after load once tasks are hydrated
    const timer = setTimeout(checkDueDeliverables, 3000);
    return () => clearTimeout(timer);
  }, [checkDueDeliverables]);

  // --- CALENDAR MANAGEMENT ---
  const activeCalendar = calendarAccounts.find(a => a.isActive) || calendarAccounts[0];

  const addCalendarAccount = () => {
    if (!newCalEmail.trim()) return;
    const newAccount: CalendarAccount = {
      id: Math.random().toString(36).substr(2, 9),
      email: newCalEmail,
      calendarId: newCalId || 'primary',
      accountIndex: newCalIndex,
      isActive: false
    };
    setCalendarAccounts([...calendarAccounts, newAccount]);
    setNewCalEmail('');
    setNewCalId('primary');
    setNewCalIndex(0);
  };

  const switchCalendar = (id: string) => {
    setCalendarAccounts(calendarAccounts.map(a => ({
      ...a,
      isActive: a.id === id
    })));
  };

  const deleteCalendar = (id: string) => {
    if (calendarAccounts.length <= 1) return;
    const filtered = calendarAccounts.filter(a => a.id !== id);
    if (calendarAccounts.find(a => a.id === id)?.isActive) {
      filtered[0].isActive = true;
    }
    setCalendarAccounts(filtered);
  };

  // --- VAULT ACTIONS ---
  const addLinkGroup = () => {
    if (!newGroupName.trim()) return;
    const group: LinkGroup = { id: Math.random().toString(36).substr(2, 9), name: newGroupName };
    setLinkGroups([...linkGroups, group]);
    setNewGroupName('');
  };

  const deleteLinkGroup = (id: string) => {
    setLinkGroups(linkGroups.filter(g => g.id !== id));
    setLinks(links.filter(l => l.groupId !== id));
  };

  const addLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim() || !selectedGroupId) return;
    const link: Link = {
      id: Math.random().toString(36).substr(2, 9),
      label: newLinkLabel,
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`,
      groupId: selectedGroupId
    };
    setLinks([...links, link]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const deleteLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const addClassCut = () => {
    if (!newClassName.trim()) return;
    const classCut: ClassCut = {
      id: Math.random().toString(36).substr(2, 9),
      className: newClassName,
      cutCount: 0,
      maxCuts: newMaxCuts
    };
    setClassCuts([...classCuts, classCut]);
    setNewClassName('');
  };

  const deleteClassCut = (id: string) => {
    setClassCuts(classCuts.filter(c => c.id !== id));
  };

  const updateCutCount = (id: string, delta: number) => {
    setClassCuts(classCuts.map(c => 
      c.id === id ? { ...c, cutCount: Math.max(0, c.cutCount + delta) } : c
    ));
  };

  // --- PLANNER ACTIONS ---
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskTitle,
      category: taskCategory,
      priority: taskPriority,
      status: taskStatus,
      dueDate: taskDueDate,
      remarks: taskRemarks,
      link: taskLink,
      createdAt: Date.now(),
    };

    setTasks([...tasks, newTask]);
    setTaskTitle('');
    setTaskDueDate('');
    setTaskRemarks('');
    setTaskLink('');
    // Optionally collapse after add
    setIsFormExpanded(false);
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your deliverable history?")) {
      setTasks(tasks.filter(t => t.status !== Status.FINISHED));
    }
  };

  const updateTaskField = <K extends keyof Task>(id: string, field: K, value: Task[K]) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: QuickNote = {
      id: Math.random().toString(36).substr(2, 9),
      content: newNote,
      timestamp: Date.now(),
    };
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const generateInsights = async () => {
    setLoadingInsight(true);
    const result = await getTaskInsights(tasks);
    setInsight(result);
    setLoadingInsight(false);
  };

  const getDaysLeft = (dateStr: string) => {
    if (!dateStr) return 0;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days;
  };

  // Journal Actions
  const handleNewJournalEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedEntryId(null);
    setEditingEntry({
      date: today,
      title: '',
      content: ''
    });
  };

  const saveJournalEntry = () => {
    if (!editingEntry.title || !editingEntry.content) return;

    if (selectedEntryId) {
      setJournalEntries(journalEntries.map(e => 
        e.id === selectedEntryId ? { ...e, ...editingEntry as JournalEntry } : e
      ));
    } else {
      const newEntry: JournalEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: editingEntry.date || new Date().toISOString().split('T')[0],
        title: editingEntry.title || '',
        content: editingEntry.content || '',
        timestamp: Date.now()
      };
      setJournalEntries([newEntry, ...journalEntries]);
      setSelectedEntryId(newEntry.id);
    }
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(journalEntries.filter(e => e.id !== id));
    if (selectedEntryId === id) {
      setSelectedEntryId(null);
      handleNewJournalEntry();
    }
  };

  const selectEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setEditingEntry(entry);
  };

  const statusCounts = {
    [Status.PENDING]: tasks.filter(t => t.status === Status.PENDING).length,
    [Status.BEGAN]: tasks.filter(t => t.status === Status.BEGAN).length,
    [Status.FINISHED]: tasks.filter(t => t.status === Status.FINISHED).length,
  };

  const activeTasks = tasks.filter(t => t.status !== Status.FINISHED);
  const completedTasks = tasks.filter(t => t.status === Status.FINISHED);

  const totalTasks = tasks.length || 1;
  const progressPercent = {
    pending: (statusCounts[Status.PENDING] / totalTasks) * 100,
    began: (statusCounts[Status.BEGAN] / totalTasks) * 100,
    finished: (statusCounts[Status.FINISHED] / totalTasks) * 100,
  };

  // Helper for Calendar Template URLs
  const getCalendarSyncUrl = (task: Task) => {
    const baseUrl = `https://calendar.google.com/calendar/u/${activeCalendar.accountIndex}/render?action=TEMPLATE`;
    const dates = `${task.dueDate.replace(/-/g, '')}/${task.dueDate.replace(/-/g, '')}`;
    return `${baseUrl}&text=${encodeURIComponent(task.title)}&dates=${dates}&details=${encodeURIComponent(task.remarks || 'Sync from Millie\'s Workspace')}&src=${encodeURIComponent(activeCalendar.calendarId)}`;
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-[#E0E0E0]">
      {/* Top Banner */}
      <header className="sticky top-0 z-50 bg-[#5E548E] shadow-lg p-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-5 md:mt-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={20} className="text-[#BEB4D6] fill-[#BEB4D6]" />
                  <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">
                    Millie's Workspace
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-xl font-bold text-[#BEB4D6]">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-sm text-white/60 font-medium">
                    {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-md md:mt-2">
              <div className="flex justify-between text-[10px] font-bold mb-2 px-1 tracking-wider uppercase">
                <span className="text-white/60">Pending ({statusCounts[Status.PENDING]})</span>
                <span className="text-[#BEB4D6]">Began ({statusCounts[Status.BEGAN]})</span>
                <span className="text-white">Finished ({statusCounts[Status.FINISHED]})</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden flex shadow-inner border border-white/10">
                <div className="bg-[#BEB4D6]/40 transition-all duration-700" style={{ width: `${progressPercent.pending}%` }} />
                <div className="bg-[#BEB4D6] transition-all duration-700" style={{ width: `${progressPercent.began}%` }} />
                <div className="bg-white transition-all duration-700" style={{ width: `${progressPercent.finished}%` }} />
              </div>
            </div>

            <div className="hidden lg:flex flex-col gap-2 w-72">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#BEB4D6]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Quick Note</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={requestNotificationPermission}
                    className={`p-1 rounded transition-colors ${notificationsEnabled ? 'text-brand-light' : 'text-white/40 hover:text-white'}`}
                    title={notificationsEnabled ? "Notifications Enabled" : "Enable Due Alerts"}
                  >
                    {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                  </button>
                  {notes.length > 0 && (
                    <span className="text-[9px] font-bold text-[#5E548E] bg-white px-1.5 py-0.5 rounded shadow-sm">
                      {notes.length} Active
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a reminder..." 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  className="text-xs border border-white/20 rounded-lg px-3 py-2 flex-1 focus:ring-1 focus:ring-[#BEB4D6] outline-none bg-white/10 text-white placeholder-white/40"
                />
                <button onClick={addNote} className="bg-white/20 text-white px-3 rounded-lg hover:bg-white/30 transition-colors shadow-sm border border-white/20">
                  <Plus size={16} />
                </button>
              </div>

              {notes.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {notes.map(note => (
                    <div key={note.id} className="group relative bg-white/10 p-2 rounded-lg border border-white/5 hover:bg-white/20 transition-colors">
                      <p className="text-[11px] text-white leading-tight pr-4">
                        {note.content}
                      </p>
                      <button onClick={() => deleteNote(note.id)} className="absolute top-1 right-1 text-white/40 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        <div className="flex gap-2 mb-8 bg-[#5E548E]/10 p-1 rounded-xl w-fit border border-[#5E548E]/20 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('planner')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'planner' ? 'bg-[#5E548E] shadow-xl text-white' : 'text-[#5E548E] hover:text-[#5E548E]/70'
            }`}
          >
            <LayoutDashboard size={18} />
            Deliverables
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'calendar' ? 'bg-[#5E548E] shadow-xl text-white' : 'text-[#5E548E] hover:text-[#5E548E]/70'
            }`}
          >
            <CalendarIcon size={18} />
            Calendar
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'journal' ? 'bg-[#5E548E] shadow-xl text-white' : 'text-[#5E548E] hover:text-[#5E548E]/70'
            }`}
          >
            <BookOpen size={18} />
            Journal
          </button>
          <button 
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'vault' ? 'bg-[#5E548E] shadow-xl text-white' : 'text-[#5E548E] hover:text-[#5E548E]/70'
            }`}
          >
            <Library size={18} />
            Vault
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'insights' ? 'bg-[#5E548E] shadow-xl text-white' : 'text-[#5E548E] hover:text-[#5E548E]/70'
            }`}
          >
            <Lightbulb size={18} />
            AI Insights
          </button>
        </div>

        {activeTab === 'planner' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            <div className="order-1 flex flex-col gap-6">
              {/* Active Tasks Header */}
              <div className="flex items-center justify-between px-4">
                <h2 className="text-xl font-bold text-[#5E548E] flex items-center gap-2">
                  <LayoutDashboard size={20} />
                  Active Deliverables
                </h2>
                <span className="text-[10px] font-bold bg-[#5E548E] text-white px-3 py-1 rounded-full uppercase tracking-widest">
                  {activeTasks.length} Pending
                </span>
              </div>

              {/* Active Tasks Table */}
              <div className="bg-[#5E548E] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                      <tr className="bg-[#5E548E]/80 border-b border-white/10">
                        <th className="px-6 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest">Task</th>
                        <th className="px-4 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest w-32">Category</th>
                        <th className="px-4 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest w-32">Priority</th>
                        <th className="px-4 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest w-32">Status</th>
                        <th className="px-4 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest w-24">Due</th>
                        <th className="px-4 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest">Remarks</th>
                        <th className="px-4 py-5 text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest w-16 text-center">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeTasks.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-20 text-center text-white/40 italic">No active deliverables. Time to plan!</td></tr>
                      ) : (
                        activeTasks.sort((a,b) => getDaysLeft(a.dueDate) - getDaysLeft(b.dueDate)).map((task) => {
                          const daysLeft = getDaysLeft(task.dueDate);
                          const isOverdue = daysLeft < 0;
                          return (
                            <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <input 
                                      className="bg-transparent border-none focus:ring-0 font-semibold text-white outline-none flex-1"
                                      value={task.title}
                                      onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                                    />
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <a href={getCalendarSyncUrl(task)} target="_blank" rel="noreferrer" className="p-1 text-[#BEB4D6] hover:text-white transition-colors" title={`Sync to ${activeCalendar.email}`}><ExternalLink size={12} /></a>
                                      <button onClick={() => deleteTask(task.id)} className="p-1 text-white/20 hover:text-red-300 transition-colors" title="Delete"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <select value={task.category} onChange={(e) => updateTaskField(task.id, 'category', e.target.value as Category)} className={`text-[10px] font-bold px-2 py-1 rounded-md border outline-none cursor-pointer ${CATEGORY_COLORS[task.category]}`}>
                                  {Object.values(Category).map(cat => <option key={cat} value={cat} className="bg-[#5E548E] text-white">{cat}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-4">
                                <select value={task.priority} onChange={(e) => updateTaskField(task.id, 'priority', e.target.value as Priority)} className={`w-full text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tighter outline-none cursor-pointer ${PRIORITY_COLORS[task.priority]}`}>
                                  {Object.values(Priority).map(p => <option key={p} value={p} className="bg-[#5E548E] text-white">{p}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-4">
                                <select value={task.status} onChange={(e) => updateTaskField(task.id, 'status', e.target.value as Status)} className={`w-full text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tighter border outline-none cursor-pointer ${STATUS_COLORS[task.status]}`}>
                                  {Object.values(Status).map(s => <option key={s} value={s} className="bg-[#5E548E] text-white">{s}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <input type="date" className={`bg-transparent text-[11px] font-semibold border-none focus:ring-0 outline-none p-0 cursor-pointer ${isOverdue ? 'text-red-300 font-bold' : 'text-white'}`} value={task.dueDate} onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)} />
                                  <span className={`text-[9px] ${isOverdue ? 'text-red-300 font-bold' : 'text-[#BEB4D6]'}`}>{isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 min-w-[200px]">
                                <textarea className="w-full bg-white/10 border border-white/5 focus:border-[#BEB4D6]/40 rounded p-1 text-[11px] text-white/90 outline-none resize-none h-6 focus:h-20 transition-all" value={task.remarks} placeholder="Add remarks..." onChange={(e) => updateTaskField(task.id, 'remarks', e.target.value)} />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-2 relative">
                                  {task.link ? <a href={task.link.startsWith('http') ? task.link : `https://${task.link}`} target="_blank" rel="noreferrer" className="text-[#BEB4D6] hover:text-white" title={task.link}><LinkIcon size={14} /></a> : <div className="text-white/20"><LinkIcon size={14} /></div>}
                                  <input type="text" className="hidden group-hover:block absolute bg-[#5E548E] border border-white/20 shadow-2xl rounded px-2 py-1 text-[10px] z-10 -mt-10 w-40 outline-none text-white" value={task.link} placeholder="Paste link..." onChange={(e) => updateTaskField(task.id, 'link', e.target.value)} />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Create Task Form - Collapsible Section */}
            <div className="order-2">
              <div className="bg-[#5E548E] rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => setIsFormExpanded(!isFormExpanded)}
                  className="w-full flex items-center justify-between p-8 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <Plus size={28} className={`text-[#BEB4D6] transition-transform duration-300 ${isFormExpanded ? 'rotate-45' : 'rotate-0'}`} />
                    <div>
                      <h3 className="text-xl font-bold text-white leading-tight">Create New Deliverable</h3>
                      <p className="text-[#BEB4D6]/60 text-xs font-medium uppercase tracking-wider mt-1">
                        {isFormExpanded ? 'Fill in the details below' : 'Click to add a new task to your schedule'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                    {isFormExpanded ? <ChevronUp size={24} className="text-white" /> : <ChevronDown size={24} className="text-white" />}
                  </div>
                </button>

                {isFormExpanded && (
                  <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <div className="border-t border-white/10 pt-6">
                      <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Task Title</label>
                          <input type="text" placeholder="Goal for the day..." className="w-full border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] placeholder-[#231942]/50 font-medium" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Due Date</label>
                          <input type="date" className="w-full border border-white/10 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] font-medium [color-scheme:light]" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Category</label>
                          <select className="w-full border border-white/10 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] font-medium" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value as Category)}>{Object.values(Category).map(cat => <option key={cat} value={cat} className="bg-[#BEB4D6]">{cat}</option>)}</select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Priority</label>
                          <select className="w-full border border-white/10 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] font-medium" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as Priority)}>{Object.values(Priority).map(p => <option key={p} value={p} className="bg-[#BEB4D6]">{p}</option>)}</select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Status</label>
                          <select className="w-full border border-white/10 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] font-medium" value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as Status)}>{Object.values(Status).map(s => <option key={s} value={s} className="bg-[#BEB4D6]">{s}</option>)}</select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Remarks</label>
                          <textarea placeholder="Notes or details..." className="w-full border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] h-[100px] resize-none placeholder-[#231942]/50 font-medium" value={taskRemarks} onChange={(e) => setTaskRemarks(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[#BEB4D6] uppercase mb-1.5 tracking-wide">Link (Optional)</label>
                            <input type="url" placeholder="https://..." className="w-full border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#BEB4D6]/30 outline-none bg-[#BEB4D6] text-[#231942] placeholder-[#231942]/50 font-medium" value={taskLink} onChange={(e) => setTaskLink(e.target.value)} />
                          </div>
                          <button type="submit" className="w-full h-full bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl shadow-2xl transition-all flex items-center justify-center gap-2 border border-white/20 py-4"><Plus size={20} />Add Deliverable</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deliverable History - Collapsible Section */}
            <div className="order-3">
              <div className="bg-[#231942] rounded-3xl border border-white/10 shadow-xl overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <History size={24} className={`text-[#BEB4D6] transition-transform duration-300 ${isHistoryExpanded ? 'scale-110' : 'scale-100'}`} />
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">Deliverable History</h3>
                      <p className="text-[#BEB4D6]/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Archived {completedTasks.length} finished tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isHistoryExpanded && completedTasks.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                        className="text-[10px] font-bold text-red-400 bg-red-400/10 px-3 py-1 rounded-lg border border-red-400/20 hover:bg-red-400/20 transition-all uppercase tracking-tighter"
                      >
                        Clear History
                      </button>
                    )}
                    <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                      {isHistoryExpanded ? <ChevronUp size={20} className="text-white/40" /> : <ChevronDown size={20} className="text-white/40" />}
                    </div>
                  </div>
                </button>

                {isHistoryExpanded && (
                  <div className="px-6 pb-6 pt-2 animate-in fade-in duration-300">
                    <div className="border-t border-white/5 pt-4">
                      <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="px-4 py-3 text-[9px] font-bold text-white/30 uppercase tracking-widest">Completed Task</th>
                              <th className="px-4 py-3 text-[9px] font-bold text-white/30 uppercase tracking-widest w-24">Category</th>
                              <th className="px-4 py-3 text-[9px] font-bold text-white/30 uppercase tracking-widest w-24">Date</th>
                              <th className="px-4 py-3 text-[9px] font-bold text-white/30 uppercase tracking-widest">Summary</th>
                              <th className="px-4 py-3 text-[9px] font-bold text-white/30 uppercase tracking-widest w-16 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {completedTasks.length === 0 ? (
                              <tr><td colSpan={5} className="px-4 py-12 text-center text-white/20 italic text-xs tracking-wide">No completed history yet. Get things done!</td></tr>
                            ) : (
                              completedTasks.sort((a,b) => b.createdAt - a.createdAt).map((task) => (
                                <tr key={task.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle size={14} className="text-[#BEB4D6]/40" />
                                      <span className="text-white/50 line-through font-medium text-xs">{task.title}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">{task.category}</span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="text-[10px] text-white/30 font-bold">{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <p className="text-[10px] text-white/40 truncate max-w-[300px]">{task.remarks || 'No remarks provided'}</p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => updateTaskField(task.id, 'status', Status.BEGAN)} 
                                        className="p-1.5 bg-white/5 text-white/40 hover:text-[#BEB4D6] hover:bg-white/10 rounded-lg transition-all"
                                        title="Restore to Active"
                                      >
                                        <RotateCcw size={12} />
                                      </button>
                                      <button 
                                        onClick={() => deleteTask(task.id)} 
                                        className="p-1.5 bg-red-400/5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        title="Delete Permanently"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom duration-500">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="bg-white rounded-[2.5rem] p-4 shadow-2xl border border-[#5E548E]/20 min-h-[600px] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-4">
                  <div className="flex items-center gap-3">
                    <Globe className="text-[#5E548E]" size={20} />
                    <h3 className="text-xl font-bold text-[#5E548E] truncate max-w-[200px]">
                      {activeCalendar.email}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                        onClick={() => setIsManagingCalendars(!isManagingCalendars)}
                        className={`p-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isManagingCalendars ? 'bg-[#5E548E] text-white shadow-lg' : 'bg-brand-bg text-[#5E548E] hover:bg-gray-200'}`}
                     >
                       <Settings size={16} />
                       Manage Accounts
                     </button>
                     <div className="hidden md:flex gap-1.5 ml-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                     </div>
                  </div>
                </div>
                
                <div className="flex-1 relative">
                   <iframe 
                    src={`https://calendar.google.com/calendar/u/${activeCalendar.accountIndex}/embed?src=${encodeURIComponent(activeCalendar.calendarId)}&ctz=UTC`} 
                    style={{ border: 0, borderRadius: '1.5rem', width: '100%', height: '100%' }} 
                    frameBorder="0" 
                    scrolling="no"
                    title={`Google Calendar - ${activeCalendar.email}`}
                  ></iframe>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              {isManagingCalendars ? (
                <div className="bg-[#5E548E] p-8 rounded-[2rem] shadow-2xl border border-white/10 animate-in slide-in-from-right duration-300">
                   <div className="flex items-center justify-between mb-6">
                     <h4 className="text-white font-bold flex items-center gap-2">
                       <User size={20} className="text-brand-light" />
                       Calendar Accounts
                     </h4>
                     <button onClick={() => setIsManagingCalendars(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                   </div>

                   <div className="space-y-3 mb-8 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                     {calendarAccounts.map(acc => (
                       <div key={acc.id} className={`p-4 rounded-2xl border transition-all ${acc.isActive ? 'bg-white border-white shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                         <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold truncate max-w-[120px] ${acc.isActive ? 'text-[#5E548E]' : 'text-white'}`}>{acc.email}</span>
                            <div className="flex gap-2">
                              {!acc.isActive && (
                                <button onClick={() => switchCalendar(acc.id)} className="p-1.5 bg-brand-light/20 text-brand-light rounded-lg hover:bg-brand-light hover:text-white transition-all">
                                  <Globe size={14} />
                                </button>
                              )}
                              {calendarAccounts.length > 1 && (
                                <button onClick={() => deleteCalendar(acc.id)} className={`p-1.5 rounded-lg transition-all ${acc.isActive ? 'text-gray-300 hover:text-red-500' : 'text-white/20 hover:text-red-300'}`}>
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${acc.isActive ? 'text-[#5E548E]/60' : 'text-white/40'}`}>
                              Index: /u/{acc.accountIndex}
                            </span>
                            {acc.isActive && <div className="text-[10px] font-bold text-[#5E548E] flex items-center gap-1"><ShieldCheck size={10}/> Active</div>}
                         </div>
                       </div>
                     ))}
                   </div>

                   <div className="pt-6 border-t border-white/10 space-y-4">
                     <h5 className="text-brand-light text-[10px] font-bold uppercase tracking-widest">Connect New Account</h5>
                     <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Account Label (e.g. Work)" 
                          className="w-full text-xs bg-brand-light text-brand-dark rounded-xl px-4 py-3 placeholder-brand-dark/50 font-medium outline-none"
                          value={newCalEmail}
                          onChange={(e) => setNewCalEmail(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                             <label className="text-[9px] font-bold text-brand-light uppercase">Account Index</label>
                             <input 
                              type="number" 
                              className="w-full text-xs bg-brand-light text-brand-dark rounded-xl px-4 py-2 font-bold outline-none"
                              value={newCalIndex}
                              onChange={(e) => setNewCalIndex(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                             <label className="text-[9px] font-bold text-brand-light uppercase">Calendar ID</label>
                             <input 
                              type="text" 
                              className="w-full text-xs bg-brand-light text-brand-dark rounded-xl px-4 py-2 font-bold outline-none"
                              value={newCalId}
                              onChange={(e) => setNewCalId(e.target.value)}
                            />
                          </div>
                        </div>
                        <button onClick={addCalendarAccount} className="w-full py-3 bg-white/20 hover:bg-white text-white hover:text-brand-dark font-bold rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2">
                           <Plus size={18} /> Add Account
                        </button>
                     </div>
                   </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#5E548E] p-6 rounded-[2rem] shadow-2xl border border-white/10">
                    <h4 className="text-white font-bold flex items-center gap-2 mb-4"><CalendarIcon size={18} />Workspace Schedule</h4>
                    <div className="space-y-3">
                      {tasks.length === 0 ? <p className="text-white/50 text-xs italic">Add deliverables to see them synced here.</p> : (
                        tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 8).map(t => (
                          <div key={t.id} className="bg-white/10 p-3 rounded-xl border border-white/5 hover:bg-white/20 transition-all flex items-center justify-between">
                            <div className="flex flex-col"><span className="text-white text-sm font-semibold truncate max-w-[150px]">{t.title}</span><span className="text-[10px] text-white/60">{new Date(t.dueDate).toLocaleDateString()}</span></div>
                            <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${STATUS_COLORS[t.status]}`}>{t.status}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-[#5E548E]/80 p-6 rounded-[2rem] shadow-xl border border-white/5">
                    <h4 className="text-brand-light text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Globe size={14}/> Current Account</h4>
                    <div className="bg-white/10 p-4 rounded-xl border border-brand-light/20">
                       <p className="text-white font-bold text-sm mb-1">{activeCalendar.email}</p>
                       <p className="text-brand-light text-[10px] uppercase font-bold tracking-tighter">Sync Index: /u/{activeCalendar.accountIndex}</p>
                    </div>
                    <p className="text-white/50 text-[11px] leading-relaxed mt-4">
                      All new sync templates will now target <b>{activeCalendar.email}</b>. Toggle management to connect multiple Google accounts.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-right duration-500 min-h-[70vh]">
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-[#5E548E] p-6 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col h-full max-h-[70vh]">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-white font-bold flex items-center gap-2"><StickyNote size={18} />Past Entries</h4>
                  <button onClick={handleNewJournalEntry} className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all"><Plus size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {journalEntries.length === 0 ? <div className="text-center py-10"><p className="text-white/40 text-xs italic">No memories yet. Start writing!</p></div> : (
                    journalEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <button key={entry.id} onClick={() => selectEntry(entry)} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex flex-col gap-1 relative overflow-hidden group border ${selectedEntryId === entry.id ? 'bg-white border-white shadow-xl translate-x-1' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                        {selectedEntryId === entry.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#5E548E]"></div>}
                        <div className="flex justify-between items-start"><span className={`text-[10px] font-bold uppercase tracking-wider ${selectedEntryId === entry.id ? 'text-[#5E548E]' : 'text-[#BEB4D6]'}`}>{new Date(entry.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span><Trash2 size={14} className={`${selectedEntryId === entry.id ? 'text-gray-300 hover:text-red-500' : 'text-white/20 hover:text-red-300'} transition-colors`} onClick={(e) => { e.stopPropagation(); deleteJournalEntry(entry.id); }} /></div>
                        <span className={`font-bold text-sm truncate ${selectedEntryId === entry.id ? 'text-[#5E548E]' : 'text-white'}`}>{entry.title || 'Untitled Entry'}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-[#5E548E]/20 h-full flex flex-col min-h-[600px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3"><input type="date" className="bg-[#5E548E]/5 border border-[#5E548E]/10 rounded-xl px-4 py-2 text-sm font-bold text-[#5E548E] focus:ring-2 focus:ring-[#5E548E]/20 outline-none" value={editingEntry.date} onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })} /><span className="text-[10px] font-bold text-[#BEB4D6] uppercase tracking-widest hidden md:inline">{selectedEntryId ? 'Refining past memory' : 'Capturing new moment'}</span></div>
                    <input type="text" placeholder="Give your entry a title..." className="w-full text-2xl md:text-3xl font-serif font-bold text-[#5E548E] placeholder-[#BEB4D6]/40 bg-[#5E548E]/5 border border-[#5E548E]/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#5E548E]/20 outline-none transition-all shadow-sm" value={editingEntry.title} onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })} />
                  </div>
                  <button onClick={saveJournalEntry} className="flex items-center gap-2 bg-[#5E548E] hover:bg-[#4D447D] text-white px-6 py-3 rounded-2xl shadow-xl transition-all self-start md:self-center font-bold h-fit"><Save size={18} />{selectedEntryId ? 'Update' : 'Save'}</button>
                </div>
                <textarea placeholder="Dear Journal, today was..." className="flex-1 w-full bg-[#E0E0E0]/30 rounded-[1.5rem] p-6 text-lg text-gray-700 leading-relaxed placeholder-gray-400 border border-[#5E548E]/5 focus:border-[#5E548E]/20 outline-none resize-none custom-scrollbar shadow-inner" value={editingEntry.content} onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Link Repository */}
            <div className="xl:col-span-8 flex flex-col gap-8">
              <div className="bg-[#5E548E] p-8 rounded-[2rem] shadow-2xl border border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Library size={24} className="text-[#BEB4D6]" />
                    Link Repository
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="New Group Name" 
                      className="text-xs bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:ring-1 focus:ring-[#BEB4D6] outline-none"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLinkGroup()}
                    />
                    <button onClick={addLinkGroup} className="bg-[#BEB4D6] text-[#5E548E] p-2 rounded-xl hover:bg-white transition-colors">
                      <FolderPlus size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {linkGroups.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-white/5 rounded-[1.5rem] border border-dashed border-white/10">
                      <p className="text-white/30 text-sm italic">Create groups to organize your links.</p>
                    </div>
                  ) : (
                    linkGroups.map(group => (
                      <div key={group.id} className="bg-white/10 p-6 rounded-[1.5rem] border border-white/5 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
                          <h4 className="text-[#BEB4D6] font-bold text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#BEB4D6]"></span>
                            {group.name}
                          </h4>
                          <button onClick={() => deleteLinkGroup(group.id)} className="text-white/20 hover:text-red-300 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="space-y-2 flex-1">
                          {links.filter(l => l.groupId === group.id).length === 0 ? (
                            <p className="text-white/20 text-[10px] italic text-center py-4">No links in this group.</p>
                          ) : (
                            links.filter(l => l.groupId === group.id).map(link => (
                              <div key={link.id} className="group/link flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all border border-transparent hover:border-white/10">
                                <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 flex-1">
                                  <LinkIcon size={14} className="text-[#BEB4D6]" />
                                  <span className="text-white text-xs font-medium truncate max-w-[150px]">{link.label}</span>
                                </a>
                                <div className="flex items-center gap-2 opacity-0 group-hover/link:opacity-100 transition-opacity">
                                  <a href={link.url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white"><ArrowRight size={14} /></a>
                                  <button onClick={() => deleteLink(link.id)} className="text-white/20 hover:text-red-300"><X size={14} /></button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Link Form */}
                <div className="mt-10 pt-8 border-t border-white/10">
                  <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider text-[#BEB4D6]">Store New Link</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input 
                      type="text" 
                      placeholder="Label (e.g. Research Paper)" 
                      className="text-xs bg-[#BEB4D6] text-[#231942] rounded-xl px-4 py-3 placeholder-[#231942]/50 font-medium outline-none"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="URL (e.g. jstor.org/...)" 
                      className="text-xs bg-[#BEB4D6] text-[#231942] rounded-xl px-4 py-3 placeholder-[#231942]/50 font-medium outline-none md:col-span-2"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <select 
                        className="text-xs bg-[#BEB4D6] text-[#231942] rounded-xl px-4 py-3 font-medium outline-none flex-1"
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                      >
                        <option value="">Group...</option>
                        {linkGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <button onClick={addLink} className="bg-white/20 text-white p-3 rounded-xl hover:bg-white/30 transition-colors border border-white/20">
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cuts Tracker */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <div className="bg-[#5E548E] p-8 rounded-[2rem] shadow-2xl border border-white/10 h-fit">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8">
                  <Scissors size={24} className="text-[#BEB4D6]" />
                  Cuts Tracker
                </h3>

                <div className="space-y-4 mb-8">
                  {classCuts.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                      <p className="text-white/30 text-xs italic">Add classes to track your cuts.</p>
                    </div>
                  ) : (
                    classCuts.map(c => {
                      const ratio = c.cutCount / c.maxCuts;
                      const isDanger = ratio >= 0.8;
                      const isOver = ratio > 1;
                      
                      return (
                        <div key={c.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 group">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-white font-bold text-sm truncate max-w-[150px]">{c.className}</h4>
                              <p className={`text-[10px] font-bold uppercase tracking-widest ${isOver ? 'text-red-400' : isDanger ? 'text-yellow-400' : 'text-[#BEB4D6]'}`}>
                                {c.cutCount} / {c.maxCuts} Cuts Used
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCutCount(c.id, -1)} className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20">
                                <Minus size={14} />
                              </button>
                              <button onClick={() => updateCutCount(c.id, 1)} className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20">
                                <Plus size={14} />
                              </button>
                              <button onClick={() => deleteClassCut(c.id)} className="p-1.5 text-white/10 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div 
                              className={`transition-all duration-500 rounded-full ${isOver ? 'bg-red-500' : isDanger ? 'bg-yellow-400' : 'bg-[#BEB4D6]'}`}
                              style={{ width: `${Math.min(100, (c.cutCount / c.maxCuts) * 100)}%` }}
                            />
                          </div>
                          {isOver && <p className="text-[9px] text-red-400 font-bold mt-2 animate-pulse">OVER CUT LIMIT</p>}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Class Form */}
                <div className="space-y-3 pt-6 border-t border-white/10">
                  <input 
                    type="text" 
                    placeholder="Class Name" 
                    className="w-full text-xs bg-[#BEB4D6] text-[#231942] rounded-xl px-4 py-3 placeholder-[#231942]/50 font-medium outline-none"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-[#BEB4D6] uppercase flex-1">Max Cuts Allowed:</label>
                    <input 
                      type="number" 
                      className="w-16 text-xs bg-[#BEB4D6] text-[#231942] rounded-xl px-4 py-2 font-bold outline-none"
                      value={newMaxCuts}
                      onChange={(e) => setNewMaxCuts(parseInt(e.target.value) || 0)}
                    />
                    <button onClick={addClassCut} className="bg-white/20 text-white p-2 rounded-xl hover:bg-white/30 border border-white/20">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#5E548E]/80 p-6 rounded-[2rem] shadow-xl border border-white/5">
                <h4 className="text-[#BEB4D6] text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Lightbulb size={12} />
                  Vault Tip
                </h4>
                <p className="text-white/50 text-[11px] leading-relaxed italic">
                  "The Vault is your dedicated space for persistent resources. Use the cuts tracker to manage your attendance credits carefully!"
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="max-w-3xl mx-auto animate-in zoom-in duration-500">
             <div className="bg-[#5E548E] p-8 rounded-[2rem] border border-white/10 shadow-2xl text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/20"><Lightbulb className="text-white" size={40} /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Workspace Intelligence</h2>
                <p className="text-[#BEB4D6] mb-8">Get an AI-powered summary of your deliverables and upcoming deadlines.</p>
                {insight && (
                  <div className="bg-white/10 p-6 rounded-2xl text-left border border-white/10 relative mb-8 shadow-inner">
                    <p className="text-white leading-relaxed italic">"{insight}"</p>
                    <div className="absolute -top-3 -left-3 bg-[#5E548E] text-white p-2 rounded-lg shadow-lg border border-white/20"><MessageSquare size={16} /></div>
                  </div>
                )}
                <button onClick={generateInsights} disabled={loadingInsight} className={`px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl transition-all shadow-2xl flex items-center gap-3 mx-auto border border-white/20 ${loadingInsight ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {loadingInsight ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
                  {insight ? "Refresh Insights" : "Analyze Deliverables"}
                </button>
             </div>
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#5E548E] border-t border-white/10 px-6 py-3 flex justify-around md:hidden z-50 shadow-2xl overflow-x-auto">
        <button onClick={() => setActiveTab('planner')} className={`flex flex-col items-center gap-1 min-w-[60px] ${activeTab === 'planner' ? 'text-white' : 'text-white/30'}`}>
          <LayoutDashboard size={22} /><span className="text-[10px] font-bold">Deliverables</span>
        </button>
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 min-w-[60px] ${activeTab === 'calendar' ? 'text-white' : 'text-white/30'}`}>
          <CalendarIcon size={22} /><span className="text-[10px] font-bold">Calendar</span>
        </button>
        <button onClick={() => setActiveTab('journal')} className={`flex flex-col items-center gap-1 min-w-[60px] ${activeTab === 'journal' ? 'text-white' : 'text-white/30'}`}>
          <BookOpen size={22} /><span className="text-[10px] font-bold">Journal</span>
        </button>
        <button onClick={() => setActiveTab('vault')} className={`flex flex-col items-center gap-1 min-w-[60px] ${activeTab === 'vault' ? 'text-white' : 'text-white/30'}`}>
          <Library size={22} /><span className="text-[10px] font-bold">Vault</span>
        </button>
        <button onClick={() => setActiveTab('insights')} className={`flex flex-col items-center gap-1 min-w-[60px] ${activeTab === 'insights' ? 'text-white' : 'text-white/30'}`}>
          <Lightbulb size={22} /><span className="text-[10px] font-bold">Insights</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
