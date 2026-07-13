/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {   
  Bot, 
  MessageSquare, 
  Database, 
  Settings, 
  HelpCircle, 
  User,
  Send,
  Paperclip,
  Upload,
  X,
  FileText,
  Loader2,
  Trash2,
  Moon,
  Sun,
  LogOut,
  Edit3,
  Palette,
  Shield,
  Bell,
  LayoutDashboard, 
  Cpu, 
  Users as UsersIcon, 
  ChevronDown, 
  Save,
  Plus,
  History,
  Search,
  ArrowLeft,
  Lock,
  Mail,
  Phone,
  Languages,
  Clock,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, UploadedFile, PlatformUser } from './types';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, sileo } from 'sileo';
import 'sileo/styles.css';
import { 
  loadPlatformUsers, 
  savePlatformUsers, 
  deletePlatformUserFromDb,
  loadUserProfile, 
  saveUserProfile, 
  loadUserChats, 
  saveUserChats, 
  loadUserKnowledgeBase, 
  saveUserKnowledgeBase,
  UserProfileData 
} from './lib/firebase';

export default function App() {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'chat' | 'knowledge' | 'agent' | 'users' | 'profile'>('dashboard');
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user'>('admin');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tooltip, setTooltip] = useState<{ show: boolean, text: string, x: number, y: number }>({ show: false, text: '', x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tooltipElement = target.closest('[data-tooltip]');
      if (tooltipElement) {
        const text = tooltipElement.getAttribute('data-tooltip');
        if (text) {
          setTooltip({ show: true, text, x: e.clientX, y: e.clientY });
        }
      } else {
        setTooltip(prev => (prev.show ? { ...prev, show: false } : prev));
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    const handleMouseLeave = () => setTooltip(prev => (prev.show ? { ...prev, show: false } : prev));
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [systemPrompt, setSystemPrompt] = useState('Eres un agente de soporte técnico estricto que responde ÚNICAMENTE utilizando la información de los documentos proporcionados en la Base de Conocimiento.\n\nReglas críticas:\n1. Responde SIEMPRE y ÚNICAMENTE basándote en el contenido explícito de los documentos provistos. Si la pregunta del usuario no se puede responder con la base de conocimiento, debes decir cortésmente que la información no está disponible.\n2. Al responder, debes citar obligatoriamente el nombre del archivo exacto de donde obtuviste la información.');
  const [modelUsage, setModelUsage] = useState<Record<string, { tokens: number }>>({
    'llama-3.3-70b-versatile': { tokens: 0 },
    'llama-3.1-8b-instant': { tokens: 0 },
    'gemini-2.5-pro': { tokens: 0 },
    'gemini-2.5-flash': { tokens: 0 },
    'deepseek-r1': { tokens: 0 },
    'deepseek-v3': { tokens: 0 },
    'gpt-4o': { tokens: 0 },
    'claude-3-5-sonnet': { tokens: 0 }
  });
  
  const models: Record<string, { name: string, context: number, tpm: number }> = {
    'llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', context: 131072, tpm: 8000 },
    'llama-3.1-8b-instant': { name: 'Llama 3.1 8B', context: 131072, tpm: 8000 },
    'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', context: 2097152, tpm: 15000 },
    'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', context: 1048576, tpm: 20000 },
    'deepseek-r1': { name: 'DeepSeek R1 (Reasoning)', context: 65536, tpm: 4000 },
    'deepseek-v3': { name: 'DeepSeek V3', context: 65536, tpm: 6000 },
    'gpt-4o': { name: 'GPT-4o (Omni)', context: 128000, tpm: 10000 },
    'claude-3-5-sonnet': { name: 'Claude 3.5 Sonnet', context: 200000, tpm: 5000 }
  };
  const [chats, setChats] = useState<any[]>(() => {
    const saved = localStorage.getItem('technical_support_chats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: '1',
        title: 'Nuevo Chat',
        messages: [
          { id: '1', role: 'assistant', content: '¡Hola! Soy el agente de soporte técnico interno. ¿En qué puedo ayudarte hoy?' }
        ],
        createdAt: Date.now()
      }
    ];
  });
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const savedActive = localStorage.getItem('technical_support_active_chat_id');
    return savedActive || '1';
  });
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showSidebarDesktop, setShowSidebarDesktop] = useState(true);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [showAllFilesPage, setShowAllFilesPage] = useState(false);
  const [fileConflictInfo, setFileConflictInfo] = useState<{ filesToUpload: File[], conflictingNames: string[] } | null>(null);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [hasLoadedFromFirebase, setHasLoadedFromFirebase] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<UploadedFile[]>([]);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const defaultAdminEmail = (import.meta as any).env.VITE_ADMIN_EMAIL || '';
  const defaultAdminPassword = (import.meta as any).env.VITE_ADMIN_PASSWORD || '';
  const defaultUserEmail = (import.meta as any).env.VITE_USER_DEMO_EMAIL || '';
  const defaultUserPassword = (import.meta as any).env.VITE_USER_DEMO_PASSWORD || '';

  const [users, setUsers] = useState<PlatformUser[]>(() => {
    const saved = localStorage.getItem('technical_support_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Make sure the env admin user is present and has the updated password/role
        const adminIndex = parsed.findIndex((u: any) => u.email === defaultAdminEmail);
        if (adminIndex !== -1) {
          parsed[adminIndex].password = defaultAdminPassword;
        } else {
          parsed.unshift({ id: 'admin_env', name: 'Admin Principal', email: defaultAdminEmail, role: 'admin', password: defaultAdminPassword });
        }
        return parsed;
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: '1', name: 'Admin Principal', email: defaultAdminEmail, role: 'admin', password: defaultAdminPassword },
      { id: '2', name: 'Usuario Demo', email: defaultUserEmail, role: 'user', password: defaultUserPassword }
    ];
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState<'admin' | 'user'>('user');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormError, setUserFormError] = useState('');
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

  // Profile configuration states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('tech_support_logged_in') === 'true';
  });

  const [profileName, setProfileName] = useState(() => localStorage.getItem('tech_support_p_name') || 'Admin Principal');
  const [profileEmail, setProfileEmail] = useState(() => localStorage.getItem('tech_support_p_email') || 'admin@empresa.com');
  const [profilePhone, setProfilePhone] = useState(() => localStorage.getItem('tech_support_p_phone') || '+34 600 123 456');
  const [profileLanguage, setProfileLanguage] = useState(() => localStorage.getItem('tech_support_p_lang') || 'es');
  const [profileTimeZone, setProfileTimeZone] = useState(() => localStorage.getItem('tech_support_p_tz') || 'GMT-5');
  
  const [profileTwoFactor, setProfileTwoFactor] = useState(() => localStorage.getItem('tech_support_p_2fa') === 'true');
  const [profileNotifyEmail, setProfileNotifyEmail] = useState(() => localStorage.getItem('tech_support_p_n_email') !== 'false');
  const [profileNotifySystem, setProfileNotifySystem] = useState(() => localStorage.getItem('tech_support_p_n_sys') !== 'false');
  const [profileNotifySound, setProfileNotifySound] = useState(() => localStorage.getItem('tech_support_p_n_snd') === 'true');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

  const [showProfileSavedToast, setShowProfileSavedToast] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Sync profile options to localStorage
  useEffect(() => {
    localStorage.setItem('tech_support_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('tech_support_p_name', profileName);
    localStorage.setItem('tech_support_p_email', profileEmail);
    localStorage.setItem('tech_support_p_phone', profilePhone);
    localStorage.setItem('tech_support_p_lang', profileLanguage);
    localStorage.setItem('tech_support_p_tz', profileTimeZone);
  }, [profileName, profileEmail, profilePhone, profileLanguage, profileTimeZone]);

  useEffect(() => {
    localStorage.setItem('tech_support_p_2fa', String(profileTwoFactor));
    localStorage.setItem('tech_support_p_n_email', String(profileNotifyEmail));
    localStorage.setItem('tech_support_p_n_sys', String(profileNotifySystem));
    localStorage.setItem('tech_support_p_n_snd', String(profileNotifySound));
  }, [profileTwoFactor, profileNotifyEmail, profileNotifySystem, profileNotifySound]);

  // Keep localStorage in sync
  useEffect(() => {
    localStorage.setItem('technical_support_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('technical_support_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('technical_support_active_chat_id', activeChatId);
  }, [activeChatId]);

  // --- Firebase Synchronization ---

  // 1. Load and sync platform users, user profile, user chats, and knowledge base in a single synchronized flow with a skeleton loader
  useEffect(() => {
    if (!isLoggedIn) return;
    
    setIsInitialLoading(true);
    const emailKey = profileEmail.toLowerCase();

    const loadAll = async () => {
      try {
        await Promise.all([
          // A. Platform Users
          loadPlatformUsers().then(firebaseUsers => {
            if (firebaseUsers && firebaseUsers.length > 0) {
              setUsers(firebaseUsers);
            } else {
              savePlatformUsers(users);
            }
          }),
          // B. User Profile Settings
          loadUserProfile(emailKey).then(firebaseProfile => {
            if (firebaseProfile) {
              setProfileName(firebaseProfile.name);
              setProfilePhone(firebaseProfile.phone);
              setProfileLanguage(firebaseProfile.language);
              setProfileTimeZone(firebaseProfile.timeZone);
              setProfileTwoFactor(firebaseProfile.twoFactor);
              setProfileNotifyEmail(firebaseProfile.notifyEmail);
              setProfileNotifySystem(firebaseProfile.notifySystem);
              setProfileNotifySound(firebaseProfile.notifySound);
            } else {
              const currentProfile: UserProfileData = {
                name: profileName,
                email: profileEmail,
                phone: profilePhone,
                language: profileLanguage,
                timeZone: profileTimeZone,
                twoFactor: profileTwoFactor,
                notifyEmail: profileNotifyEmail,
                notifySystem: profileNotifySystem,
                notifySound: profileNotifySound
              };
              saveUserProfile(emailKey, currentProfile);
            }
          }),
          // C. User Chats
          loadUserChats(emailKey).then(firebaseChats => {
            if (firebaseChats && firebaseChats.length > 0) {
              setChats(firebaseChats);
              const firstChat = firebaseChats[0];
              if (firstChat) {
                setActiveChatId(firstChat.id);
              }
            } else {
              const defaultChats = [
                {
                  id: '1',
                  title: 'Nuevo Chat',
                  messages: [
                    { id: '1', role: 'assistant', content: '¡Hola! Soy el agente de soporte técnico interno. ¿En qué puedo ayudarte hoy?' }
                  ],
                  createdAt: Date.now()
                }
              ];
              setChats(defaultChats);
              setActiveChatId('1');
              saveUserChats(emailKey, defaultChats);
            }
          }),
          // D. User Knowledge Base (KB)
          loadUserKnowledgeBase(emailKey).then(firebaseKB => {
            if (firebaseKB) {
              setKnowledgeBase(firebaseKB);
            } else {
              setKnowledgeBase([]);
              saveUserKnowledgeBase(emailKey, []);
            }
          })
        ]);
      } catch (error) {
        console.error("Error synchronizing with Firebase, using local cached data.", error);
      } finally {
        setHasLoadedFromFirebase(true);
        // Enforce a small delay to make the beautiful skeleton loader visible and smooth
        setTimeout(() => {
          setIsInitialLoading(false);
        }, 1000);
      }
    };

    loadAll();
  }, [profileEmail, isLoggedIn]);

  // Sync platform users to Firestore whenever the state is modified
  useEffect(() => {
    if (isLoggedIn && hasLoadedFromFirebase && users.length > 0) {
      savePlatformUsers(users);
    }
  }, [users, isLoggedIn, hasLoadedFromFirebase]);

  // 3. Auto-sync Profile changes to Firestore
  useEffect(() => {
    if (!isLoggedIn || !profileEmail || !hasLoadedFromFirebase) return;
    const currentProfile: UserProfileData = {
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
      language: profileLanguage,
      timeZone: profileTimeZone,
      twoFactor: profileTwoFactor,
      notifyEmail: profileNotifyEmail,
      notifySystem: profileNotifySystem,
      notifySound: profileNotifySound
    };
    saveUserProfile(profileEmail.toLowerCase(), currentProfile);
  }, [profileName, profileEmail, profilePhone, profileLanguage, profileTimeZone, profileTwoFactor, profileNotifyEmail, profileNotifySystem, profileNotifySound, isLoggedIn, hasLoadedFromFirebase]);

  // 4. Auto-sync Chats to Firestore
  useEffect(() => {
    if (!isLoggedIn || !profileEmail || !hasLoadedFromFirebase || chats.length === 0) return;
    saveUserChats(profileEmail.toLowerCase(), chats);
  }, [chats, profileEmail, isLoggedIn, hasLoadedFromFirebase]);

  // 5. Auto-sync Knowledge Base to Firestore
  useEffect(() => {
    if (!isLoggedIn || !profileEmail || !hasLoadedFromFirebase) return;
    saveUserKnowledgeBase(profileEmail.toLowerCase(), knowledgeBase);
  }, [knowledgeBase, profileEmail, isLoggedIn, hasLoadedFromFirebase]);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || {
    id: '1',
    title: 'Nuevo Chat',
    messages: [
      { id: '1', role: 'assistant', content: '¡Hola! Soy el agente de soporte técnico interno. ¿En qué puedo ayudarte hoy?' }
    ]
  };
  const messages = activeChat.messages;

  const currentChatHasContent = activeChat && activeChat.messages.some((m: any) => m.role === 'user');

  const updateMessagesForActiveChat = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setChats(prevChats => {
      return prevChats.map(c => {
        if (c.id === activeChatId) {
          const resolvedMessages = typeof newMessages === 'function' ? newMessages(c.messages) : newMessages;
          
          // Requirement: "que el nombre de cada chat sea el mismo al primer mensaje de cada respectivo chat"
          const firstUserMsg = resolvedMessages.find(m => m.role === 'user');
          let newTitle = c.title;
          if (firstUserMsg && (c.title === 'Nuevo Chat' || c.title === '')) {
            newTitle = firstUserMsg.content;
          }
          
          return {
            ...c,
            title: newTitle,
            messages: resolvedMessages
          };
        }
        return c;
      });
    });
  };

  const handleCreateNewChat = () => {
    if (!currentChatHasContent) return; // Prevent creating if current is empty

    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: 'Nuevo Chat',
      messages: [
        { id: '1', role: 'assistant', content: '¡Hola! Soy el agente de soporte técnico interno. ¿En qué puedo ayudarte hoy?' }
      ],
      createdAt: Date.now()
    };

    setChats(prev => [...prev, newChat]);
    setActiveChatId(newChatId);
    setShowHistoryMobile(false);
  };

  const handleSwitchChat = (targetChatId: string) => {
    if (targetChatId === activeChatId) return;

    const targetChat = chats.find(ch => ch.id === targetChatId);
    const targetChatHasContent = targetChat && targetChat.messages.some((m: any) => m.role === 'user');

    if (!currentChatHasContent && targetChatHasContent) {
      // Remove current active empty chat from the chats list
      setChats(prev => prev.filter(ch => ch.id !== activeChatId));
    }

    setActiveChatId(targetChatId);
    setShowHistoryMobile(false);
  };

  const confirmDeleteChat = (id: string) => {
    let nextActiveId = activeChatId;
    
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const resetChat = {
          id: '1',
          title: 'Nuevo Chat',
          messages: [
            { id: '1', role: 'assistant', content: '¡Hola! Soy el agente de soporte técnico interno. ¿En qué puedo ayudarte hoy?' }
          ],
          createdAt: Date.now()
        };
        nextActiveId = '1';
        return [resetChat];
      }
      return filtered;
    });
    
    // If we deleted the active chat, select another one
    if (activeChatId === id) {
      const remaining = chats.filter(c => c.id !== id);
      if (remaining.length > 0) {
        nextActiveId = remaining[remaining.length - 1].id;
      } else {
        nextActiveId = '1';
      }
    }
    
    setActiveChatId(nextActiveId);
    setChatToDelete(null);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim()
    };

    const updatedMessagesWithUser = [...messages, userMessage];
    updateMessagesForActiveChat(updatedMessagesWithUser);
    setInputValue('');
    setIsLoading(true);

    try {
      const contextTexts = knowledgeBase
        .filter(file => file.status === 'processed' && file.extractedText)
        .map(file => file.extractedText as string);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessagesWithUser.map(m => ({ role: m.role, content: m.content })),
          knowledgeBaseContext: contextTexts,
          model: selectedModel,
          systemPrompt: systemPrompt
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      if (data.usage?.total_tokens) {
        setModelUsage(prev => ({
          ...prev,
          [selectedModel]: {
            ...prev[selectedModel],
            tokens: (prev[selectedModel]?.tokens || 0) + data.usage.total_tokens
          }
        }));
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message
      };

      updateMessagesForActiveChat(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo un error al procesar tu solicitud. Por favor, verifica tu conexión o la clave de la API.'
      };
      updateMessagesForActiveChat(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const proceedWithUpload = async (filesArray: File[]) => {
    const newFiles: UploadedFile[] = filesArray.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      status: 'uploading'
    }));

    setKnowledgeBase(prev => [...prev, ...newFiles]);

    const formData = new FormData();
    filesArray.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload files');
      }

      setKnowledgeBase(prev => prev.map((f) => {
        const fileIndexInBatch = newFiles.findIndex(nf => nf.id === f.id);
        if (fileIndexInBatch !== -1) {
          return {
            ...f,
            status: 'processed',
            extractedText: data.texts[fileIndexInBatch]
          };
        }
        return f;
      }));
    } catch (error) {
      console.error(error);
      setKnowledgeBase(prev => prev.map(f => 
        newFiles.find(nf => nf.id === f.id) ? { ...f, status: 'error' } : f
      ));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFilesArray = Array.from(files);
    const conflicts = selectedFilesArray.filter(sf => 
      knowledgeBase.some(kbFile => kbFile.name.toLowerCase() === sf.name.toLowerCase())
    );

    if (conflicts.length > 0) {
      setFileConflictInfo({
        filesToUpload: selectedFilesArray,
        conflictingNames: conflicts.map(c => c.name)
      });
    } else {
      proceedWithUpload(selectedFilesArray);
    }
  };

  const removeFile = (id: string) => {
    setKnowledgeBase(prev => prev.filter(f => f.id !== id));
  };

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormRole('user');
    setUserFormPassword('');
    setUserFormError('');
    setUserModalOpen(true);
  };

  const handleOpenEditUserModal = (user: PlatformUser) => {
    setEditingUser(user);
    setUserFormName(user.name);
    setUserFormEmail(user.email);
    setUserFormRole(user.role);
    setUserFormPassword(user.password || '');
    setUserFormError('');
    setUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userFormName.trim()) {
      setUserFormError('El nombre es obligatorio.');
      return;
    }
    if (!userFormEmail.trim()) {
      setUserFormError('El correo electrónico es obligatorio.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userFormEmail.trim())) {
      setUserFormError('Introduce un correo electrónico válido.');
      return;
    }

    if (!editingUser && !userFormPassword.trim()) {
      setUserFormError('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    if (userFormPassword && userFormPassword.length < 8) {
      setUserFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: userFormName.trim(),
        email: userFormEmail.trim(),
        role: userFormRole,
        password: userFormPassword.trim() ? userFormPassword.trim() : u.password
      } : u));
      sileo.success({ title: 'Usuario actualizado', description: `Se guardaron los cambios del usuario ${userFormName.trim()}.` });
    } else {
      const newUser: PlatformUser = {
        id: `${Date.now()}`,
        name: userFormName.trim(),
        email: userFormEmail.trim(),
        role: userFormRole,
        password: userFormPassword.trim()
      };
      setUsers(prev => [...prev, newUser]);
      sileo.success({ title: 'Usuario registrado', description: `El usuario ${userFormName.trim()} ha sido registrado.` });
    }
    setUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    const user = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    deletePlatformUserFromDb(id);
    setUserToDeleteId(null);
    sileo.success({ title: 'Usuario eliminado', description: `El usuario ${user ? user.name : ''} fue removido exitosamente.` });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordChangeError('Por favor complete todos los campos de contraseña.');
      setPasswordChangeSuccess('');
      sileo.warning({ title: 'Datos incompletos', description: 'Por favor complete todos los campos de contraseña.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('La nueva contraseña y la confirmación no coinciden.');
      setPasswordChangeSuccess('');
      sileo.error({ title: 'Error de coincidencia', description: 'La nueva contraseña y la confirmación no coinciden.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeError('La nueva contraseña debe tener al menos 6 caracteres.');
      setPasswordChangeSuccess('');
      sileo.warning({ title: 'Contraseña débil', description: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    // Success simulation
    setPasswordChangeError('');
    setPasswordChangeSuccess('¡Contraseña actualizada correctamente!');
    sileo.success({ title: 'Contraseña actualizada', description: 'Tu contraseña de acceso ha sido modificada.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setPasswordChangeSuccess('');
    }, 4000);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = () => {
      const trimmedEmail = loginEmail.trim();
      const trimmedPassword = loginPassword.trim();

      if (!trimmedEmail || !trimmedPassword) {
        setLoginError('Por favor, ingresa tu correo y contraseña.');
        sileo.warning({ title: 'Campos incompletos', description: 'Por favor, ingresa tu correo y contraseña.' });
        return;
      }

      // Check if matching in the registered users list
      const foundUser = users.find(u => u.email.toLowerCase() === trimmedEmail.toLowerCase());

      if (foundUser) {
        const expectedPassword = foundUser.password || (foundUser.email === defaultAdminEmail ? defaultAdminPassword : '');
        if (expectedPassword && trimmedPassword === expectedPassword) {
          setLoginError('');
          setCurrentUserRole(foundUser.role);
          setProfileName(foundUser.name);
          setProfileEmail(foundUser.email);
          setIsLoggedIn(true);
          sileo.success({ title: '¡Bienvenido!', description: `Sesión iniciada correctamente como ${foundUser.name}.` });
          return;
        }
      }

      // Direct fallback to .env credentials
      if (trimmedEmail.toLowerCase() === defaultAdminEmail.toLowerCase() && trimmedPassword === defaultAdminPassword) {
        setLoginError('');
        setCurrentUserRole('admin');
        setProfileName('Admin Principal');
        setProfileEmail(defaultAdminEmail);
        setIsLoggedIn(true);
        sileo.success({ title: '¡Bienvenido!', description: 'Sesión iniciada como Administrador Principal.' });
        return;
      }

      setLoginError('Credenciales incorrectas. Inténtalo de nuevo.');
      sileo.error({ title: 'Error de ingreso', description: 'Credenciales incorrectas. Inténtalo de nuevo.' });
    };

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div
          key="login-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn("grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full transition-colors", theme === 'dark' ? 'dark' : '')}
          style={{ backgroundColor: '#FFF8CE' }}
        >
          <Toaster position="top-center" theme={theme === 'dark' ? 'dark' : 'light'} />
        {/* Left Column: Login Form */}
        <div className="col-span-1 lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 md:p-16 bg-white dark:bg-neutral-900 border-r border-neutral-200/60 dark:border-neutral-800/60 relative z-10 transition-colors">

          {/* Centered Mobile Copywriting (Visible only on smaller viewports) */}
          <div className="lg:hidden w-full text-center py-4 mb-6 flex flex-col items-center">
            <div className="space-y-4 flex flex-col items-center">
              <p className="text-xs font-semibold text-neutral-700/80 uppercase tracking-widest">
                AGENTE DE SOPORTE
              </p>
              <h1 className="text-4xl font-black text-neutral-950 tracking-tight uppercase leading-none space-y-1">
                <span className="block">POTENCIADO</span>
                <span className="block text-neutral-900/90">CON IA</span>
              </h1>
              <p className="text-[11px] font-semibold text-neutral-700/80 uppercase tracking-widest pt-3 border-t border-neutral-950/15 w-44">
                IA ENTRENADA CON TUS DATOS
              </p>
            </div>
          </div>

          <div className="my-auto max-w-sm w-full mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Ingresa tus credenciales para administrar la plataforma
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <div className="relative">
                  <input 
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginError('');
                    }}
                    id="login-email"
                    autoComplete="off"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-neutral-100"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail size={14} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Contraseña</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError('');
                    }}
                    id="login-password"
                    autoComplete="new-password"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:focus:ring-neutral-100"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock size={14} />
                  </div>
                </div>
              </div>

              {loginError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center mt-1">{loginError}</p>
              )}

              <div className="pt-2">
                <button 
                  onClick={handleLogin}
                  className="w-full bg-neutral-950 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-white rounded py-2.5 text-sm font-semibold transition-colors shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Entrar</span>
                </button>
              </div>
            </div>


          </div>

          {/* Footer branding */}
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center lg:text-left mt-8">
            <span>© {new Date().getFullYear()} Plataforma AI de Soporte Técnico.</span>
          </div>
        </div>

        {/* Right Column: Animated Background & Copywriting */}
        <div 
          className="hidden lg:flex lg:col-span-7 relative overflow-hidden flex-col justify-between p-12 select-none"
          style={{ backgroundColor: '#FFF8CE' }}
        >
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e6dfb8_1px,transparent_1px),linear-gradient(to_bottom,#e6dfb8_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

          {/* Dynamic flowing background animation blobs */}
          <motion.div 
            animate={{
              x: [0, 80, -40, 0],
              y: [0, -60, 40, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-40 -right-4 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[90px] pointer-events-none z-0"
          />
          <motion.div 
            animate={{
              x: [0, -90, 60, 0],
              y: [0, 80, -50, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -bottom-40 left-10 w-[400px] h-[400px] bg-orange-400/10 rounded-full blur-[80px] pointer-events-none z-0"
          />

          {/* Subtle animated light particles */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 800, 
                  y: Math.random() * 600 + 400, 
                  opacity: Math.random() * 0.3 + 0.1,
                  scale: Math.random() * 0.5 + 0.5 
                }}
                animate={{ 
                  y: -100,
                  opacity: [0, 0.6, 0.6, 0]
                }}
                transition={{ 
                  duration: Math.random() * 12 + 10, 
                  repeat: Infinity, 
                  delay: Math.random() * 5,
                  ease: "linear"
                }}
                className="absolute w-1.5 h-1.5 bg-amber-600/30 rounded-full blur-[1px]"
              />
            ))}
          </div>

          {/* Copywriting */}
          <div className="z-10 my-auto mx-auto text-center w-full max-w-lg px-6 flex flex-col items-center">
            <div className="space-y-4 sm:space-y-6 flex flex-col items-center">
              {/* AGENTE DE SOPORTE (tamaño chico y menos bold) */}
              <p className="text-xs sm:text-sm font-semibold text-neutral-700/80 uppercase tracking-widest">
                AGENTE DE SOPORTE
              </p>
              
              {/* POTENCIADO & CON IA (tamaño grande y bold) */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-950 tracking-tight uppercase leading-none space-y-1 sm:space-y-2">
                <span className="block">POTENCIADO</span>
                <span className="block text-neutral-900/90">CON IA</span>
              </h1>
              
              {/* IA ENTRENADA CON TUS DATOS (tamaño chico y menos bold) */}
              <p className="text-[11px] sm:text-xs font-semibold text-neutral-700/80 uppercase tracking-widest pt-4 border-t border-neutral-950/15 w-48">
                IA ENTRENADA CON TUS DATOS
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      ) : isInitialLoading ? (
        <motion.div
          key="skeleton-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn("flex h-screen w-full p-2 sm:p-3 overflow-hidden transition-colors", theme === 'dark' ? 'dark bg-neutral-950 text-neutral-200' : 'bg-neutral-50 text-neutral-800')}
        >
          {/* Skeleton Sidebar */}
          <div className="w-64 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded flex flex-col justify-between p-4 shrink-0 hidden md:flex">
            <div className="space-y-6">
              {/* Logo / Header */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                </div>
              </div>

              {/* Navigation Items */}
              <div className="space-y-3 pt-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded">
                    <div className="w-5 h-5 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                    <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Section */}
            <div className="p-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="space-y-1 flex-1">
                <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-2.5 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Skeleton Main Panel */}
          <div className="flex-1 rounded ml-0 md:ml-3 flex flex-col overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 p-6 space-y-6">
            {/* Main Header */}
            <div className="flex justify-between items-center pb-4 border-b border-neutral-100 dark:border-neutral-800/50">
              <div className="space-y-2">
                <div className="h-6 w-44 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              </div>
            </div>

            {/* Main Content Dashboard Layout Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded border border-neutral-200/50 dark:border-neutral-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    <div className="h-5 w-12 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Bento Loading Layout Block */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Left bento panel */}
              <div className="lg:col-span-8 bg-neutral-50 dark:bg-neutral-800/20 rounded border border-neutral-200/50 dark:border-neutral-800/50 p-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between">
                          <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                          <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                        </div>
                        <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-8 w-full bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              </div>

              {/* Right bento panel */}
              <div className="lg:col-span-4 bg-neutral-50 dark:bg-neutral-800/20 rounded border border-neutral-200/50 dark:border-neutral-800/50 p-6 flex flex-col justify-between">
                <div className="space-y-4 flex flex-col items-center">
                  <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse self-start" />
                  <div className="w-32 h-32 rounded-full border-8 border-neutral-200 dark:border-neutral-800 animate-pulse mt-4 flex items-center justify-center" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
      <motion.div
        key="main-app"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("flex h-screen w-full p-2 sm:p-3 overflow-hidden transition-colors", theme === 'dark' ? 'dark bg-neutral-900' : 'bg-white')}
      >
      {tooltip.show && (
        <div 
          className="fixed z-50 pointer-events-none px-2 py-1 text-xs font-medium bg-black text-white dark:bg-white dark:text-black whitespace-nowrap"
          style={{ 
            left: tooltip.x + 14, 
            top: tooltip.y + 14,
            borderRadius: '2px'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Sidebar - Matching wireframe structure */}
      <div className="w-16 sm:w-20 flex flex-col items-center py-4 shrink-0">
        {/* Logo */}
        <button className="cursor-pointer w-8 h-8 flex items-center justify-center mb-auto text-neutral-700 hover:text-neutral-900 transition-colors">
          <Bot size={20} />
        </button>
        
        {/* Middle Buttons */}
        
        <div className="flex flex-col gap-6 my-auto items-center">
          <button onClick={() => setActiveModule("chat")}
            className={cn("cursor-pointer",
              "w-10 h-10 flex items-center justify-center transition-colors",
              activeModule === 'chat' ? "text-black dark:text-white" : "text-neutral-500 hover:text-neutral-800"
            )}
            data-tooltip="Chat"
          >
            <MessageSquare size={20} />
          </button>
          <button onClick={() => setActiveModule("dashboard")}
            className={cn("cursor-pointer",
              "w-10 h-10 flex items-center justify-center transition-colors",
              activeModule === 'dashboard' ? "text-black dark:text-white" : "text-neutral-500 hover:text-neutral-800"
            )}
            data-tooltip="Dashboard"
          >
            <LayoutDashboard size={20} />
          </button>
          <button onClick={() => setActiveModule("knowledge")}
            className={cn("cursor-pointer",
              "w-10 h-10 flex items-center justify-center transition-colors",
              activeModule === 'knowledge' ? "text-black dark:text-white" : "text-neutral-500 hover:text-neutral-800"
            )}
            data-tooltip="Base de Conocimiento"
          >
            <Database size={20} />
          </button>
          <button onClick={() => setActiveModule("agent")}
            className={cn("cursor-pointer",
              "w-10 h-10 flex items-center justify-center transition-colors",
              activeModule === 'agent' ? "text-black dark:text-white" : "text-neutral-500 hover:text-neutral-800"
            )}
            data-tooltip="Ajustes del Agente"
          >
            <Cpu size={20} />
          </button>
          <button onClick={() => setActiveModule("users")}
            className={cn("cursor-pointer",
              "w-10 h-10 flex items-center justify-center transition-colors",
              activeModule === 'users' ? "text-black dark:text-white" : "text-neutral-500 hover:text-neutral-800"
            )}
            data-tooltip="Usuarios"
          >
            <UsersIcon size={20} />
          </button>
        </div>

        {/* Profile Pic */}
        <button onClick={() => setActiveModule("profile")} className={cn("cursor-pointer", "w-10 h-10 flex items-center justify-center mt-auto transition-colors", activeModule === 'profile' ? "text-black dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300")} data-tooltip="Perfil">
          <User size={20} />
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 rounded ml-2 sm:ml-4 overflow-hidden flex flex-col relative transition-colors">
        <div className="flex-1 flex flex-col overflow-hidden transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {activeModule === 'chat' ? (
            <div className="flex-1 flex overflow-hidden h-full">
              {/* Mobile Drawer Overlay */}
              {showHistoryMobile && (
                <div 
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                  onClick={() => setShowHistoryMobile(false)}
                />
              )}

              {/* Chat History Sidebar (Desktop & Mobile Drawer) */}
              <div className={cn(
                "flex flex-col bg-neutral-50 dark:bg-neutral-900/95 shrink-0 z-40 transition-all duration-300 ease-in-out overflow-hidden",
                "fixed inset-y-0 left-0 w-72 md:static",
                showSidebarDesktop 
                  ? "md:w-64 md:opacity-100 border-r border-neutral-200 dark:border-neutral-800" 
                  : "md:w-0 md:opacity-0 md:pointer-events-none border-r border-transparent",
                showHistoryMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              )}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Historial de Chat</h2>
                  <button 
                    onClick={() => {
                      setShowHistoryMobile(false);
                      setShowSidebarDesktop(false);
                    }}
                    className="cursor-pointer p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded"
                    title="Cerrar lateral"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* New Chat Button */}
                <div className="p-4">
                  <button
                    onClick={handleCreateNewChat}
                    disabled={!currentChatHasContent}
                    className={cn(
                      "cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors border shadow-sm",
                      currentChatHasContent 
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700" 
                        : "bg-neutral-100 dark:bg-neutral-800/40 text-neutral-400 border-neutral-200 dark:border-neutral-800 cursor-not-allowed opacity-60"
                    )}
                    data-tooltip={!currentChatHasContent ? "El chat actual no tiene contenido aún" : "Crear un nuevo chat"}
                  >
                    <Plus size={16} />
                    <span>Nuevo Chat</span>
                  </button>
                </div>

                {/* Chats list */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                  {chats.map((c) => {
                    const isActive = c.id === activeChatId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSwitchChat(c.id)}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-3 rounded text-sm font-medium cursor-pointer transition-all",
                          isActive 
                            ? "bg-neutral-200/60 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold" 
                            : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 hover:text-neutral-900 dark:hover:text-neutral-200"
                        )}
                      >
                        <MessageSquare size={16} className={cn("shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-neutral-400")} />
                        <span className="flex-1 truncate pr-6 text-xs sm:text-sm font-medium" title={c.title}>
                          {c.title}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatToDelete(c.id);
                          }}
                          className="cursor-pointer absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 rounded transition-all focus:opacity-100"
                          data-tooltip="Borrar chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
                {/* Chat Header */}
                <div className="px-6 py-4 flex items-center justify-between bg-transparent shrink-0 border-b border-neutral-100 dark:border-neutral-850">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setShowHistoryMobile(prev => !prev);
                        setShowSidebarDesktop(prev => !prev);
                      }}
                      className="cursor-pointer p-2 -ml-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors flex items-center justify-center"
                      title="Historial de Chat"
                      data-tooltip="Historial de Chat"
                    >
                      <History size={20} />
                    </button>
                    <div>
                      <h1 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Soporte Técnico</h1>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                        {activeChat.title === 'Nuevo Chat' ? 'Agente impulsado por IA' : activeChat.title}
                      </p>
                    </div>
                  </div>
                  {knowledgeBase.filter(f => f.status === 'processed').length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-blue-600 dark:text-neutral-100 bg-blue-50 dark:bg-neutral-800 px-3 py-1.5 rounded font-medium">
                      <Database size={14} />
                      <span>Conectado a {knowledgeBase.filter(f => f.status === 'processed').length} archivo(s)</span>
                    </div>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 bg-transparent">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={cn(
                          "flex gap-3 sm:gap-4",
                          message.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 text-blue-600 dark:text-neutral-100 flex items-center justify-center shrink-0 mt-1">
                            <Bot size={18} />
                          </div>
                        )}
                        
                        <div 
                          className={cn(
                            "max-w-[85%] sm:max-w-[80%] rounded px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base leading-relaxed",
                            message.role === 'user' 
                              ? "bg-blue-600 dark:bg-neutral-700 text-white rounded" 
                              : "bg-neutral-100/80 text-neutral-800 rounded dark:bg-neutral-800 dark:text-neutral-100"
                          )}
                        >
                          {message.role === 'assistant' ? (
                            <div className="markdown-body prose prose-sm max-w-none text-neutral-800 dark:text-neutral-100">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        {message.role === 'user' && (
                          <div className="w-8 h-8 text-neutral-600 flex items-center justify-center shrink-0 mt-1">
                            <User size={18} />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-4 justify-start">
                        <div className="w-8 h-8 text-blue-600 dark:text-neutral-100 flex items-center justify-center shrink-0 mt-1">
                          <Bot size={18} />
                        </div>
                        <div className="bg-neutral-100/80 rounded px-5 py-4 flex items-center gap-2 dark:bg-neutral-800">
                          <div className="w-2 h-2 rounded bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-4 sm:p-6 bg-transparent shrink-0">
                  <div className="max-w-4xl mx-auto flex items-end gap-2 bg-neutral-50 dark:bg-neutral-800/30 p-2 sm:p-2.5 rounded focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 dark:focus-within:ring-neutral-500/50 dark:focus-within:border-neutral-500 transition-all border border-neutral-200 dark:border-neutral-750">
                    <button onClick={() => setActiveModule('knowledge')}
                      className="cursor-pointer p-2 sm:p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors shrink-0 rounded"
                      data-tooltip="Añadir a la base de conocimiento"
                    >
                      <Paperclip size={20} />
                    </button>
                    <textarea 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe tu consulta de soporte..."
                      className="flex-1 bg-transparent resize-none outline-none max-h-32 min-h-[24px] py-2 px-2 text-neutral-700 dark:text-neutral-100 placeholder:text-neutral-400 text-sm sm:text-base"
                      rows={1}
                    />
                    <button onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="cursor-pointer p-2.5 sm:p-3 bg-blue-600 dark:bg-neutral-700 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Send size={18} className="ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeModule === 'knowledge' ? (
            showAllFilesPage ? (
              /* Search Page View */
              <div className="flex-1 flex flex-col h-full bg-transparent dark:bg-transparent transition-colors">
                <div className="px-6 py-4 bg-transparent dark:bg-transparent shrink-0 flex justify-between items-center border-b border-neutral-150 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setShowAllFilesPage(false);
                        setFileSearchQuery('');
                      }}
                      className="cursor-pointer p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center"
                      title="Volver"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Buscador de Base de Conocimiento</h2>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Buscar archivos cargados por nombre</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* Search Input Box */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                        <Search size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar archivo por nombre..."
                        value={fileSearchQuery}
                        onChange={(e) => setFileSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base transition-all"
                      />
                      {fileSearchQuery && (
                        <button
                          onClick={() => setFileSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Filtered Files List */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pl-1">
                        <h3 className="text-xs sm:text-sm font-semibold text-neutral-600 uppercase tracking-wider">
                          {fileSearchQuery ? 'Resultados de búsqueda' : 'Todos los archivos'} ({
                            knowledgeBase.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).length
                          })
                        </h3>
                        {fileSearchQuery && (
                          <button 
                            onClick={() => setFileSearchQuery('')}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Limpiar filtro
                          </button>
                        )}
                      </div>

                      {knowledgeBase.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {knowledgeBase
                            .filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()))
                            .map(file => (
                              <div key={file.id} className="bg-transparent p-3 sm:p-4 rounded border border-neutral-150 dark:border-neutral-800 flex items-center gap-3 sm:gap-4 group">
                                <div className="w-10 h-10 text-neutral-500 flex items-center justify-center shrink-0">
                                  {file.status === 'uploading' ? (
                                    <Loader2 size={18} className="animate-spin text-blue-600 dark:text-neutral-100" />
                                  ) : (
                                    <FileText size={18} className="text-blue-600 dark:text-neutral-100" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800 truncate" data-tooltip={file.name}>{file.name}</p>
                                  <p className="text-xs text-neutral-500 capitalize">
                                    {file.status === 'processed' ? 'Procesado' : file.status === 'uploading' ? 'Subiendo...' : 'Error'}
                                  </p>
                                </div>
                                {currentUserRole === 'admin' && (
                                  <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file.id); }}
                                    className="cursor-pointer p-2 text-neutral-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    data-tooltip="Eliminar archivo"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-150 dark:border-neutral-800/50 rounded">
                          <FileText className="mx-auto text-neutral-400 mb-3 animate-pulse" size={36} />
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">No se encontraron archivos que coincidan con "{fileSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Knowledge Base Module */
              <div className="flex-1 flex flex-col h-full bg-transparent dark:bg-transparent transition-colors">
                <div className="px-6 py-4  bg-transparent dark:bg-transparent shrink-0 flex justify-between items-center transition-colors">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Base de Conocimiento</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Sube archivos PDF, Word, Excel o PPTX para alimentar al agente</p>
                  </div>
                  <button onClick={() => setActiveModule('chat')}
                    className="cursor-pointer p-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200  rounded transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                  <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
                    
                    {/* Upload Area */}
                    {currentUserRole === 'admin' ? (
                      <div className="bg-transparent p-6 sm:p-8 rounded flex flex-col items-center justify-center text-center gap-4 hover:border-blue-500 dark:hover:border-neutral-500 hover:bg-blue-50/50 dark:hover:bg-neutral-800/50 transition-all border border-dashed border-neutral-300 dark:border-neutral-700 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload size={24} className="sm:w-7 sm:h-7" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-medium text-neutral-800 dark:text-neutral-100">Haz clic o arrastra archivos aquí</h3>
                          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">Soporta .pdf, .docx, .xlsx, .pptx, .txt</p>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          multiple 
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        />
                      </div>
                    ) : (
                      <div className="bg-transparent p-6 sm:p-8 rounded flex flex-col items-center justify-center text-center gap-4 border border-dashed border-neutral-300 dark:border-neutral-700 opacity-70">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 text-neutral-400 flex items-center justify-center">
                          <Upload size={24} className="sm:w-7 sm:h-7" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-medium text-neutral-800 dark:text-neutral-100">Subida desactivada</h3>
                          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">Solo los administradores pueden subir archivos a la base de conocimiento.</p>
                        </div>
                      </div>
                    )}

                    {/* Files List */}
                    {knowledgeBase.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-neutral-600 uppercase tracking-wider pl-1">Archivos en contexto ({knowledgeBase.length})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {knowledgeBase.slice(0, 10).map(file => (
                            <div key={file.id} className="bg-transparent p-3 sm:p-4 rounded border border-neutral-150 dark:border-neutral-800 flex items-center gap-3 sm:gap-4  group">
                              <div className="w-10 h-10 text-neutral-500 flex items-center justify-center shrink-0">
                                {file.status === 'uploading' ? (
                                  <Loader2 size={18} className="animate-spin text-blue-600 dark:text-neutral-100" />
                                ) : (
                                  <FileText size={18} className="text-blue-600 dark:text-neutral-100" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-800 truncate" data-tooltip={file.name}>{file.name}</p>
                                <p className="text-xs text-neutral-500 capitalize">
                                  {file.status === 'processed' ? 'Procesado' : file.status === 'uploading' ? 'Subiendo...' : 'Error'}
                                </p>
                              </div>
                              {currentUserRole === 'admin' && (
                              <button onClick={(e) => { e.stopPropagation(); setFileToDelete(file.id); }}
                                className="cursor-pointer p-2 text-neutral-400 hover:text-red-500  rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                data-tooltip="Eliminar archivo"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            </div>
                          ))}
                        </div>

                        {knowledgeBase.length > 10 && (
                          <div className="flex justify-center mt-6">
                            <button 
                              onClick={() => {
                                setFileSearchQuery('');
                                setShowAllFilesPage(true);
                              }}
                              className="cursor-pointer flex items-center gap-2 px-5 py-2 text-sm font-medium text-blue-600 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
                            >
                              <span>Ver más</span>
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )
          ) : activeModule === 'dashboard' ? (
            <div className="flex-1 flex flex-col h-full bg-transparent dark:bg-transparent transition-colors">
              <div className="px-6 py-4 bg-transparent dark:bg-transparent shrink-0 flex justify-between items-center transition-colors border-b border-neutral-100 dark:border-neutral-800/50">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Dashboard Insights</h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Análisis y actividad del sistema en tiempo real</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">SISTEMA ACTIVO</span>
                </div>
              </div>
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1 */}
                    <div className="bg-white dark:bg-neutral-800/40 p-5 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm flex items-center gap-4">
                      <div className="p-1 text-blue-600 dark:text-blue-400">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Mensajes Totales</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                          {chats.reduce((acc, c) => acc + c.messages.length, 0)}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Promedio: <span className="font-mono">{chats.length > 0 ? (chats.reduce((acc, c) => acc + c.messages.length, 0) / chats.length).toFixed(1) : '0'}</span> por chat
                        </p>
                      </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-white dark:bg-neutral-800/40 p-5 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm flex items-center gap-4">
                      <div className="p-1 text-indigo-600 dark:text-indigo-400">
                        <Database size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Documentos en KB</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                          {knowledgeBase.length}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Procesados: <span className="font-mono">{knowledgeBase.filter(f => f.status === 'processed').length}</span> con éxito
                        </p>
                      </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-white dark:bg-neutral-800/40 p-5 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm flex items-center gap-4">
                      <div className="p-1 text-amber-600 dark:text-amber-400">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Modelos Disponibles</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                          {Object.keys(models).length}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Activo: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{models[selectedModel]?.name || 'Llama'}</span>
                        </p>
                      </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-white dark:bg-neutral-800/40 p-5 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm flex items-center gap-4">
                      <div className="p-1 text-emerald-600 dark:text-emerald-400">
                        <UsersIcon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Usuarios Activos</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">
                          {users.length}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          <span className="font-mono">{users.filter(u => u.role === 'admin').length}</span> Admin | <span className="font-mono">{users.filter(u => u.role === 'user').length}</span> Agentes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bento Grid Insights */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - Token Usage Graph */}
                    <div className="lg:col-span-8 bg-white dark:bg-neutral-800/30 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">Uso de Tokens por Modelo</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Tokens consumidos acumulados por motor de IA</p>
                          </div>
                          <div className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-[11px] font-mono text-neutral-600 dark:text-neutral-300">
                            HISTÓRICO
                          </div>
                        </div>

                        <div className="space-y-4 mt-6">
                          {Object.entries(models).map(([key, info]) => {
                            const tokensUsed = modelUsage[key]?.tokens || 0;
                            // Let's find maximum tokens to scale relative to the most used model
                            const maxTokens = Math.max(...Object.values(modelUsage).map(m => m.tokens), 1);
                            const relativePercent = Math.max(1, (tokensUsed / maxTokens) * 100);
                            
                            // Color scheme for different models
                            let barColor = 'bg-blue-500';
                            if (key.includes('gemini')) barColor = 'bg-purple-500';
                            else if (key.includes('deepseek')) barColor = 'bg-cyan-500';
                            else if (key.includes('gpt')) barColor = 'bg-emerald-500';
                            else if (key.includes('claude')) barColor = 'bg-amber-500';

                            return (
                              <div key={key} className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-neutral-700 dark:text-neutral-200">{info.name}</span>
                                  <span className="font-mono text-neutral-500 dark:text-neutral-400">
                                    {tokensUsed.toLocaleString()} tokens
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full transition-all duration-500", barColor)}
                                    style={{ width: `${relativePercent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                        <span>Los límites de TPM varían según el modelo seleccionado en Ajustes</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Modelo activo: {models[selectedModel]?.name}</span>
                      </div>
                    </div>

                    {/* Right Column - KB Health Circular Gauge */}
                    <div className="lg:col-span-4 bg-white dark:bg-neutral-800/30 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-6 flex flex-col">
                      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Base de Conocimiento</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">Tasa de procesamiento exitoso</p>

                      <div className="flex-1 flex flex-col items-center justify-center">
                        {/* Circular Progress (Donut Chart) SVG */}
                        {(() => {
                          const totalFiles = knowledgeBase.length;
                          const processed = knowledgeBase.filter(f => f.status === 'processed').length;
                          const successRate = totalFiles > 0 ? Math.round((processed / totalFiles) * 100) : 100;
                          
                          const radius = 50;
                          const circ = 2 * Math.PI * radius;
                          const strokeOffset = circ - (successRate / 100) * circ;

                          return (
                            <div className="relative flex items-center justify-center">
                              <svg className="w-36 h-36 transform -rotate-90">
                                <circle
                                  cx="72"
                                  cy="72"
                                  r={radius}
                                  className="stroke-neutral-100 dark:stroke-neutral-800"
                                  strokeWidth="10"
                                  fill="transparent"
                                />
                                <circle
                                  cx="72"
                                  cy="72"
                                  r={radius}
                                  className="stroke-blue-500 transition-all duration-1000 ease-out"
                                  strokeWidth="10"
                                  fill="transparent"
                                  strokeDasharray={circ}
                                  strokeDashoffset={strokeOffset}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute text-center">
                                <span className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100 font-mono">
                                  {successRate}%
                                </span>
                                <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold mt-0.5">
                                  EFECTIVIDAD
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Breakdown Legend */}
                        <div className="w-full grid grid-cols-3 gap-2 mt-6 text-center text-xs">
                          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/60">
                            <span className="block text-neutral-400 mb-0.5">Listo</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                              {knowledgeBase.filter(f => f.status === 'processed').length}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/60">
                            <span className="block text-neutral-400 mb-0.5">Cargando</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                              {knowledgeBase.filter(f => f.status === 'uploading').length}
                            </span>
                          </div>
                          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/60">
                            <span className="block text-neutral-400 mb-0.5">Error</span>
                            <span className="font-bold text-red-500 font-mono">
                              {knowledgeBase.filter(f => f.status === 'error').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Second Row Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Document Type Distribution */}
                    <div className="bg-white dark:bg-neutral-800/30 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-6">
                      <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Distribución de Formatos</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Formatos de archivo indexados en el sistema de búsqueda</p>
                      
                      {(() => {
                        const fileTypeCounts: Record<string, number> = {};
                        knowledgeBase.forEach(f => {
                          const ext = f.name.split('.').pop()?.toUpperCase() || 'DESCONOCIDO';
                          fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;
                        });

                        const total = Object.values(fileTypeCounts).reduce((a, b) => a + b, 0);

                        if (total === 0) {
                          return (
                            <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
                              No hay documentos cargados en el sistema.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4 py-2">
                            {Object.entries(fileTypeCounts).map(([ext, count]) => {
                              const pct = Math.round((count / total) * 100);
                              let barBg = 'bg-amber-400';
                              if (ext === 'PDF') barBg = 'bg-red-400';
                              else if (ext === 'TXT') barBg = 'bg-blue-400';
                              else if (ext === 'DOCX') barBg = 'bg-indigo-400';
                              else if (ext === 'DOC') barBg = 'bg-sky-400';

                              return (
                                <div key={ext} className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-neutral-700 dark:text-neutral-300 font-mono">{ext}</span>
                                    <span className="text-neutral-500 dark:text-neutral-400">
                                      {count} {count === 1 ? 'archivo' : 'archivos'} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", barBg)} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Agent performance metrics */}
                    <div className="bg-white dark:bg-neutral-800/30 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Métricas de Respuestas</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Análisis de calidad de respuesta e interacción de IA</p>
                        
                        {(() => {
                          const assistantMsgs = chats.flatMap(c => c.messages).filter(m => m.role === 'assistant');
                          const avgLength = assistantMsgs.length > 0 
                            ? Math.round(assistantMsgs.reduce((sum, m) => sum + m.content.length, 0) / assistantMsgs.length)
                            : 0;

                          const userMsgs = chats.flatMap(c => c.messages).filter(m => m.role === 'user');
                          const totalInteractionRatio = userMsgs.length > 0 ? (assistantMsgs.length / userMsgs.length * 100).toFixed(0) : 100;

                          return (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="p-4 rounded border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/20">
                                <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1">Longitud de Respuesta</span>
                                <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{avgLength}</span>
                                <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">caracteres promedio</span>
                              </div>
                              <div className="p-4 rounded border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/20">
                                <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1">Ratio de Respuesta</span>
                                <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{totalInteractionRatio}%</span>
                                <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">Soporte asistido</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mt-6 p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-900/40 rounded text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Bot size={16} className="shrink-0 text-blue-500" />
                        <span>El agente cita de manera estricta los archivos procesados de la Base de Conocimiento en sus respuestas.</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row - Recent Activity Logs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Chats Activity */}
                    <div className="bg-white dark:bg-neutral-800/30 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">Conversaciones Recientes</h3>
                        <button 
                          onClick={() => setActiveModule('chat')}
                          className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Ir a Chats
                        </button>
                      </div>

                      {chats.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
                          No hay conversaciones registradas en este momento.
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                          {chats.slice(-3).reverse().map((c, idx) => (
                            <div key={c.id || idx} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300 shrink-0">
                                  <MessageSquare size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                    {c.title || 'Conversación vacía'}
                                  </p>
                                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5">
                                    {new Date(c.createdAt || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/40 dark:border-neutral-700/50 rounded text-neutral-600 dark:text-neutral-300 shrink-0">
                                {c.messages.length} mensajes
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Knowledge base files */}
                    <div className="bg-white dark:bg-neutral-800/30 rounded border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">Últimos Documentos</h3>
                        <button 
                          onClick={() => setActiveModule('knowledge')}
                          className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Ir a KB
                        </button>
                      </div>

                      {knowledgeBase.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
                          No hay archivos indexados en la base de conocimientos.
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                          {knowledgeBase.slice(-3).reverse().map((f, idx) => (
                            <div key={f.id || idx} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-300 shrink-0">
                                  <FileText size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                    {f.name}
                                  </p>
                                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-mono mt-0.5">
                                    {f.name.split('.').pop()}
                                  </p>
                                </div>
                              </div>
                              <span className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded uppercase font-sans tracking-wide shrink-0",
                                f.status === 'processed' ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40" :
                                f.status === 'uploading' ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100 dark:border-amber-900/40" :
                                "bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-100 dark:border-red-900/40"
                              )}>
                                {f.status === 'processed' ? 'Listo' : f.status === 'uploading' ? 'Cargando' : 'Error'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          ) : activeModule === 'agent' ? (
            
            <div className="flex-1 flex flex-col h-full bg-transparent dark:bg-transparent transition-colors">
              <div className="px-6 py-4 bg-transparent dark:bg-transparent shrink-0 flex justify-between items-center transition-colors">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Ajustes del Agente</h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Monitor en tiempo real del modelo y configuración</p>
                </div>
              </div>
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                  
                  {/* Model Selection */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-4">Selección de Modelo</h3>
                    <div className="relative">
                      <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={currentUserRole !== 'admin'}
                        className="w-full appearance-none bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {Object.entries(models).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.name} (Contexto: {info.context >= 1000000 ? `${info.context/1000000}M` : `${info.context/1000}k`}{key === 'llama-3.3-70b-versatile' ? ', Recomendado' : ''})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Prompt del Sistema (System Prompt)</h3>
                      {currentUserRole === 'admin' && (
                        <button className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                          <Save size={14} /> Guardar Cambios
                        </button>
                      )}
                    </div>
                    <textarea 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      disabled={currentUserRole !== 'admin'}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed font-mono text-sm"
                      placeholder="Escribe el prompt del sistema aquí..."
                    />
                    {currentUserRole !== 'admin' && (
                      <p className="text-xs text-neutral-500 mt-2">Solo los administradores pueden editar el prompt del sistema.</p>
                    )}
                  </div>

                  {/* Token Usage Stats */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between items-end mb-4">
                      <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Uso de Tokens ({models[selectedModel].name})</h3>
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">En vivo</span>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(1, ((modelUsage[selectedModel]?.tokens || 0) / models[selectedModel].context) * 100))}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {(((modelUsage[selectedModel]?.tokens || 0) / models[selectedModel].context) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{(modelUsage[selectedModel]?.tokens || 0).toLocaleString()} / {models[selectedModel].context.toLocaleString()} tokens de contexto</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
                      <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Ventana de Contexto Total</h3>
                      <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{models[selectedModel].context >= 1000000 ? models[selectedModel].context/1000000 + 'M' : models[selectedModel].context/1000 + 'k'}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Modelo: {models[selectedModel].name}</p>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
                      <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Tokens por Minuto (TPM)</h3>
                      <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 font-mono">{(messages.length * 45).toLocaleString()}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Límite actual: {models[selectedModel].tpm.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeModule === 'users' ? (

            <div className="flex-1 flex flex-col h-full bg-transparent dark:bg-transparent transition-colors">
              <div className="px-6 py-4 bg-transparent dark:bg-transparent shrink-0 flex justify-between items-center transition-colors">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Usuarios y Accesos</h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Gestiona quién tiene acceso a la plataforma</p>
                </div>
                {currentUserRole === 'admin' && (
                  <button 
                    onClick={handleOpenAddUserModal}
                    className="cursor-pointer bg-blue-600 dark:bg-neutral-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Añadir Usuario
                  </button>
                )}
              </div>
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700">
                        <tr>
                          <th className="px-6 py-4 font-medium">Nombre</th>
                          <th className="px-6 py-4 font-medium">Email</th>
                          <th className="px-6 py-4 font-medium">Rol</th>
                          <th className="px-6 py-4 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-neutral-900 dark:text-neutral-100">{u.name}</td>
                            <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">{u.email}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded text-xs font-medium",
                                u.role === 'admin' 
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                                  : "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300"
                              )}>
                                {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {currentUserRole === 'admin' ? (
                                <>
                                  <button 
                                    onClick={() => handleOpenEditUserModal(u)}
                                    className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-4 font-medium"
                                  >
                                    Editar
                                  </button>
                                  <button 
                                    onClick={() => setUserToDeleteId(u.id)}
                                    className="cursor-pointer text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </>
                              ) : (
                                <span className="text-neutral-400 text-xs">Sin permisos</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                              No hay usuarios registrados en el sistema.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  

                </div>
              </div>
            </div>

          ) : activeModule === 'profile' ? (
            <div className="flex-1 flex flex-col h-full bg-transparent dark:bg-transparent transition-colors">
              <div className="px-6 py-4 bg-transparent dark:bg-transparent shrink-0 flex justify-between items-center transition-colors">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">Configuración de Perfil</h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Gestiona tu información de cuenta, seguridad y preferencias del sistema</p>
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Toast notification inside profile screen for visual feedback */}
                  {showProfileSavedToast && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded p-4 flex items-center justify-between text-emerald-800 dark:text-emerald-400 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Check size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">¡Cambios guardados!</p>
                          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Tu configuración de perfil se ha guardado correctamente.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowProfileSavedToast(false)}
                        className="p-1 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 rounded cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Top user summary card */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded border border-neutral-200 dark:border-neutral-700 p-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <User size={36} />
                    </div>
                    <div className="text-center sm:text-left flex-1">
                      <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{profileName || 'Usuario Actual'}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{profileEmail || 'usuario@empresa.com'}</p>
                      <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {currentUserRole === 'admin' ? 'Administrador' : 'Usuario estándar'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300">
                          Sesión Activa
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bento Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Account details & Appearance */}
                    <div className="space-y-6">
                      {/* Account Details Form */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                          <User size={16} className="text-neutral-400" />
                          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">Información Personal</h3>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                            <input 
                              type="text" 
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ej. Juan Pérez"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
                            <input 
                              type="email" 
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="ejemplo@empresa.com"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Número de Teléfono</label>
                            <input 
                              type="text" 
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="+34 600 123 456"
                            />
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => {
                                localStorage.setItem('tech_support_p_name', profileName);
                                localStorage.setItem('tech_support_p_email', profileEmail);
                                localStorage.setItem('tech_support_p_phone', profilePhone);
                                localStorage.setItem('tech_support_p_lang', profileLanguage);
                                localStorage.setItem('tech_support_p_tz', profileTimeZone);
                                setShowProfileSavedToast(true);
                                setTimeout(() => {
                                  setShowProfileSavedToast(false);
                                }, 3000);
                              }}
                              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <Save size={13} />
                              <span>Guardar Datos</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Appearance theme card */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                          <Palette size={16} className="text-neutral-400" />
                          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">Personalización Visual</h3>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">Modo de Interfaz</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Elige entre la apariencia clara y la oscura.</p>
                            </div>
                            <button onClick={toggleTheme} className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded text-xs font-medium transition-colors">
                              {theme === 'dark' ? (
                                <>
                                  <Sun size={14} className="text-amber-500" />
                                  <span>Tema Claro</span>
                                </>
                              ) : (
                                <>
                                  <Moon size={14} className="text-blue-400" />
                                  <span>Tema Oscuro</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Logout Action Card (Danger Zone) */}
                      <div className="bg-red-50/40 dark:bg-red-950/10 rounded border border-red-200/50 dark:border-red-900/30 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-red-200/30 dark:border-red-900/20 flex items-center gap-2">
                          <LogOut size={16} className="text-red-500 dark:text-red-400" />
                          <h3 className="font-semibold text-sm text-red-800 dark:text-red-300">Sesión</h3>
                        </div>
                        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-xs text-red-850 dark:text-red-300 font-bold">Cerrar Sesión Activa</p>
                            <p className="text-[11px] text-red-600 dark:text-neutral-400 mt-0.5">Sal de forma segura de la plataforma en este dispositivo.</p>
                          </div>
                          <button 
                            onClick={() => setLogoutConfirmOpen(true)}
                            className="cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-stretch sm:self-auto justify-center"
                          >
                            <LogOut size={13} />
                            <span>Cerrar Sesión</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Security & Preferences & Logout */}
                    <div className="space-y-6">
                      {/* Security Card */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                          <Shield size={16} className="text-neutral-400" />
                          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">Seguridad</h3>
                        </div>
                        <div className="p-5 space-y-4">
                          {/* Simulated Password Forms */}
                          <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-700/60 pb-4">
                            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Cambiar Contraseña</p>
                            
                            {passwordChangeError && (
                              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{passwordChangeError}</p>
                            )}
                            {passwordChangeSuccess && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{passwordChangeSuccess}</p>
                            )}

                            <div className="grid grid-cols-1 gap-2.5">
                              <input 
                                type="password" 
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Contraseña actual"
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input 
                                type="password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nueva contraseña"
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar nueva contraseña"
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="pt-2 flex justify-end">
                              <button 
                                onClick={handleUpdatePassword}
                                className="cursor-pointer bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded px-3 py-1.5 text-xs font-semibold transition-colors"
                              >
                                Actualizar Contraseña
                              </button>
                            </div>
                          </div>

                          {/* 2FA Toggle Switch */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-xs text-neutral-800 dark:text-neutral-100">Doble Factor de Autenticación (2FA)</p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Añade una capa de seguridad extra requiriendo un código.</p>
                            </div>
                            <button 
                              onClick={() => setProfileTwoFactor(!profileTwoFactor)} 
                              className={cn(
                                "cursor-pointer w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0",
                                profileTwoFactor ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                              )}
                            >
                              <div className={cn("bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200", profileTwoFactor ? "translate-x-4" : "translate-x-0")} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Notifications Preferences */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                          <Bell size={16} className="text-neutral-400" />
                          <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">Notificaciones</h3>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-xs text-neutral-800 dark:text-neutral-100">Alertas por Correo Electrónico</p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Recibir alertas de nuevos mensajes de clientes o errores graves.</p>
                            </div>
                            <button 
                              onClick={() => setProfileNotifyEmail(!profileNotifyEmail)} 
                              className={cn(
                                "cursor-pointer w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0",
                                profileNotifyEmail ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                              )}
                            >
                              <div className={cn("bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200", profileNotifyEmail ? "translate-x-4" : "translate-x-0")} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-xs text-neutral-800 dark:text-neutral-100">Notificaciones de Sistema</p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Mostrar avisos emergentes dentro de la plataforma.</p>
                            </div>
                            <button 
                              onClick={() => setProfileNotifySystem(!profileNotifySystem)} 
                              className={cn(
                                "cursor-pointer w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0",
                                profileNotifySystem ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                              )}
                            >
                              <div className={cn("bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200", profileNotifySystem ? "translate-x-4" : "translate-x-0")} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-xs text-neutral-800 dark:text-neutral-100">Efectos de Sonido</p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Sonido de alerta al recibir respuesta del agente de IA.</p>
                            </div>
                            <button 
                              onClick={() => setProfileNotifySound(!profileNotifySound)} 
                              className={cn(
                                "cursor-pointer w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0",
                                profileNotifySound ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700"
                              )}
                            >
                              <div className={cn("bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200", profileNotifySound ? "translate-x-4" : "translate-x-0")} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Confirmation Modal for File Deletion */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-w-md w-full p-6 transition-all transform scale-100 duration-200 animate-zoom-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Confirmar eliminación?
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  ¿Estás seguro de que deseas eliminar el archivo{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    "{knowledgeBase.find(f => f.id === fileToDelete)?.name || 'este archivo'}"
                  </span>{" "}
                  de la base de conocimiento? Esta acción es irreversible y el agente ya no podrá utilizar su información para responder consultas.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFileToDelete(null)}
                className="cursor-pointer px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (fileToDelete) {
                    removeFile(fileToDelete);
                    setFileToDelete(null);
                  }
                }}
                className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for File Upload Replacement */}
      {fileConflictInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-w-md w-full p-6 transition-all transform scale-100 duration-200 animate-zoom-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded">
                <Upload size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Reemplazar archivo existente?
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Los siguientes archivos ya existen con el mismo nombre y extensión en la base de conocimiento:
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 p-2 rounded border border-neutral-200 dark:border-neutral-800 space-y-1">
                  {fileConflictInfo.conflictingNames.map((name, i) => (
                    <div key={i} className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate">
                      • {name}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Se van a reemplazar y actualizar con el nuevo contenido. ¿Deseas continuar?
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setFileConflictInfo(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="cursor-pointer px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (fileConflictInfo) {
                    const { filesToUpload, conflictingNames } = fileConflictInfo;
                    setKnowledgeBase(prev => prev.filter(f => 
                      !conflictingNames.some(name => name.toLowerCase() === f.name.toLowerCase())
                    ));
                    proceedWithUpload(filesToUpload);
                    setFileConflictInfo(null);
                  }
                }}
                className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                Reemplazar y Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Chat Deletion */}
      {chatToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-w-md w-full p-6 transition-all transform scale-100 duration-200 animate-zoom-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Confirmar eliminación de chat?
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  ¿Estás seguro de que deseas eliminar la conversación{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    "{chats.find(c => c.id === chatToDelete)?.title || 'este chat'}"
                  </span>{" "}
                  ? Se perderán de forma permanente todos los mensajes de este historial.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setChatToDelete(null)}
                className="cursor-pointer px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (chatToDelete) {
                    confirmDeleteChat(chatToDelete);
                  }
                }}
                className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Adding/Editing User */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-w-md w-full p-6 transition-all transform scale-100 duration-200 animate-zoom-in">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {editingUser ? 'Editar Usuario' : 'Añadir Usuario'}
              </h3>
              <button 
                onClick={() => setUserModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {userFormError && (
                <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded border border-red-200 dark:border-red-900">
                  {userFormError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={userFormName}
                  onChange={(e) => {
                    setUserFormName(e.target.value);
                    setUserFormError('');
                  }}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={userFormEmail}
                  onChange={(e) => {
                    setUserFormEmail(e.target.value);
                    setUserFormError('');
                  }}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ejemplo@empresa.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña de Acceso'}
                </label>
                <input 
                  type="password" 
                  value={userFormPassword}
                  onChange={(e) => {
                    setUserFormPassword(e.target.value);
                    setUserFormError('');
                  }}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1">Rol de Acceso</label>
                <div className="relative">
                  <select 
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as 'admin' | 'user')}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-neutral-800 dark:text-neutral-100"
                  >
                    <option value="user">Usuario (Solo Consulta)</option>
                    <option value="admin">Administrador (Control Total)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setUserModalOpen(false)}
                className="cursor-pointer px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                {editingUser ? 'Guardar Cambios' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for User Deletion */}
      {userToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-w-md w-full p-6 transition-all transform scale-100 duration-200 animate-zoom-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Confirmar eliminación de usuario?
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  ¿Estás seguro de que deseas eliminar al usuario{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    "{users.find(u => u.id === userToDeleteId)?.name || 'este usuario'}"
                  </span>{" "}
                  del sistema? Ya no podrá acceder a las funciones del panel ni consultar el soporte.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setUserToDeleteId(null)}
                className="cursor-pointer px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (userToDeleteId) {
                    handleDeleteUser(userToDeleteId);
                  }
                }}
                className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Logout */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-xl max-w-sm w-full p-6 transition-all transform scale-100 duration-200 animate-zoom-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded">
                <LogOut size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  ¿Cerrar Sesión?
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  ¿Estás seguro de que deseas salir de la plataforma de soporte? Tendrás que iniciar sesión de nuevo.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setLogoutConfirmOpen(false)}
                className="cursor-pointer px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  setIsLoggedIn(false);
                }}
                className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" theme={theme === 'dark' ? 'dark' : 'light'} />
      </motion.div>
      )}
    </AnimatePresence>
  );
}
