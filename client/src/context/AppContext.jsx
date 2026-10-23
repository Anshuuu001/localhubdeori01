import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setCsrfToken } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Area selection (explicitly user-selected, not GPS)
  const [selectedArea, setSelectedArea] = useState({
    id: 'deori-hq',
    name: 'Deori Town (HQ)',
    marathi: 'देवरी शहर',
    type: 'Nagar Panchayat / Taluka HQ',
  });
  const [areasList, setAreasList] = useState([]);

  // App mode: personal vs business (workspace views, not separate logins)
  const [appMode, setAppMode] = useState('personal'); // 'personal' | 'business'

  // Modules & API status
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [emergencyStatus, setEmergencyStatus] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);

  // Active navigation view: 'home' | 'business-workspace' | module slug (e.g., 'jobs-hub')
  const [currentView, setCurrentView] = useState('home');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Auth state & modal
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    initialTab: 'login', // 'login' | 'register' | 'otp' | 'recovery' | 'recovery-request'
    intendedDestination: null,
  });

  // Business workspace state
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [incomingInvitations, setIncomingInvitations] = useState([]);

  // Load current session
  const checkAuth = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res?.authenticated && res.user) {
        setUser(res.user);
        if (res.csrfToken) {
          setCsrfToken(res.csrfToken);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Fetch businesses for authenticated user
  const refreshBusinesses = useCallback(async () => {
    if (!user) {
      setUserBusinesses([]);
      setActiveBusiness(null);
      return;
    }
    setLoadingBusinesses(true);
    try {
      const res = await api.listBusinesses();
      const list = res.businesses || [];
      setUserBusinesses(list);
      // If no active business selected or previous is not in list, select first
      if (list.length > 0) {
        setActiveBusiness(prev => {
          if (!prev) return list[0];
          const found = list.find(b => b.id === prev.id);
          return found || list[0];
        });
      } else {
        setActiveBusiness(null);
      }
    } catch (err) {
      console.warn('[AppContext] Failed to load businesses:', err.message);
    } finally {
      setLoadingBusinesses(false);
    }
  }, [user]);

  // Fetch incoming invitations
  const refreshInvitations = useCallback(async () => {
    if (!user) {
      setIncomingInvitations([]);
      return;
    }
    try {
      const res = await api.getMyInvitations();
      setIncomingInvitations(res.invitations || []);
    } catch (err) {
      console.warn('[AppContext] Failed to load invitations:', err.message);
    }
  }, [user]);

  // Initial API loads
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [healthRes, areasRes, modulesRes, emergencyRes] = await Promise.allSettled([
          api.getHealth(),
          api.getAreas(),
          api.getModules(),
          api.getEmergencyStatus(),
        ]);

        if (!isMounted) return;

        if (healthRes.status === 'fulfilled') {
          setHealthStatus(healthRes.value);
        }
        if (areasRes.status === 'fulfilled' && areasRes.value.data) {
          setAreasList(areasRes.value.data);
        }
        if (modulesRes.status === 'fulfilled' && modulesRes.value.data) {
          setModules(modulesRes.value.data);
        }
        if (emergencyRes.status === 'fulfilled') {
          setEmergencyStatus(emergencyRes.value);
        }
      } catch (err) {
        console.warn('[AppContext] Initial data load warning:', err.message);
      } finally {
        if (isMounted) setLoadingModules(false);
      }
    }

    loadInitialData();
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [checkAuth]);

  // Reload business and invitation data when user changes
  useEffect(() => {
    if (user) {
      refreshBusinesses();
      refreshInvitations();
    } else {
      setUserBusinesses([]);
      setActiveBusiness(null);
      setIncomingInvitations([]);
    }
  }, [user, refreshBusinesses, refreshInvitations]);

  // Phase 7 Saved Bookmarks & Pinned Modules
  const [savedItemIds, setSavedItemIds] = useState(new Set());
  const [pinnedModules, setPinnedModules] = useState(['jobs-hub', 'rentals-pg', 'krishi-bazaar', 'emergency-contacts']);

  // Fetch saved item keys when user logs in
  const refreshSavedItems = useCallback(async () => {
    if (!user) {
      setSavedItemIds(new Set());
      return;
    }
    try {
      const res = await api.getSavedItems({ limit: 100 });
      if (res.items) {
        const idSet = new Set(res.items.map(it => `${it.itemType}:${it.itemId}`));
        setSavedItemIds(idSet);
      }
    } catch (err) {
      console.warn('[AppContext] Failed to load saved items:', err.message);
    }
  }, [user]);

  // Fetch user preferences (pinned modules)
  const refreshPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getUserPreferences();
      if (res.preferences?.pinnedModules && res.preferences.pinnedModules.length > 0) {
        setPinnedModules(res.preferences.pinnedModules);
      }
    } catch (err) {
      console.warn('[AppContext] Failed to load preferences:', err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshSavedItems();
      refreshPreferences();
    } else {
      setSavedItemIds(new Set());
    }
  }, [user, refreshSavedItems, refreshPreferences]);

  const toggleSaveItem = async (itemType, itemId, module) => {
    if (!user) {
      openAuthModal('login', { action: 'save', itemType, itemId, module });
      return false;
    }

    const key = `${itemType}:${itemId}`;
    const isCurrentlySaved = savedItemIds.has(key);

    try {
      if (isCurrentlySaved) {
        await api.unsaveItemByTarget(itemType, itemId);
        setSavedItemIds(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return false;
      } else {
        await api.saveItem({ itemType, itemId, module });
        setSavedItemIds(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return true;
      }
    } catch (err) {
      console.error('[toggleSaveItem Error]', err);
      throw err;
    }
  };

  const togglePinModule = async (slug) => {
    const isPinned = pinnedModules.includes(slug);
    const updated = isPinned
      ? pinnedModules.filter(s => s !== slug)
      : [...pinnedModules, slug];

    setPinnedModules(updated);
    if (user) {
      try {
        await api.updateUserPreferences({ pinnedModules: updated });
      } catch (err) {
        console.warn('[togglePinModule Warning]', err.message);
      }
    }
  };

  // Auth modal helpers
  const openAuthModal = (tab = 'login', intendedDestination = null) => {
    setAuthModal({
      isOpen: true,
      initialTab: tab,
      intendedDestination,
    });
  };

  const closeAuthModal = () => {
    setAuthModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleLoginSuccess = (userData, csrfToken) => {
    setUser(userData);
    if (csrfToken) setCsrfToken(csrfToken);

    const destination = authModal.intendedDestination;
    closeAuthModal();

    if (destination === 'business-mode') {
      setAppMode('business');
    } else if (destination && destination.action === 'save') {
      toggleSaveItem(destination.itemType, destination.itemId, destination.module);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    setUser(null);
    setAppMode('personal');
    setCurrentView('home');
    setSavedItemIds(new Set());
    setIsAccountModalOpen(false);
  };

  // Personal vs Business toggle (workspace switch)
  const toggleAppMode = () => {
    if (appMode === 'personal') {
      if (!user) {
        openAuthModal('login', 'business-mode');
        return;
      }
      setAppMode('business');
    } else {
      setAppMode('personal');
    }
  };

  const navigateToModule = (slug) => {
    setCurrentView(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSearch = (query = '', moduleFilter = 'all') => {
    if (query) setSearchQuery(query);
    setActiveCategory(moduleFilter);
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSavedItems = () => {
    setCurrentView('saved-items');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppContext.Provider
      value={{
        // Phase 1 Foundation
        selectedArea,
        setSelectedArea,
        areasList,
        modules,
        loadingModules,
        emergencyStatus,
        healthStatus,
        currentView,
        setCurrentView,
        navigateToModule,
        navigateToHome,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        isAreaModalOpen,
        setIsAreaModalOpen,
        isDiagnosticsModalOpen,
        setIsDiagnosticsModalOpen,

        // Phase 2 Auth & Account
        user,
        setUser,
        authLoading,
        isAuthenticated: Boolean(user),
        authModal,
        openAuthModal,
        closeAuthModal,
        handleLoginSuccess,
        handleLogout,
        checkAuth,
        isAccountModalOpen,
        setIsAccountModalOpen,

        // Phase 2 Business Workspace
        appMode,
        setAppMode,
        toggleAppMode,
        userBusinesses,
        activeBusiness,
        setActiveBusiness,
        loadingBusinesses,
        refreshBusinesses,
        incomingInvitations,
        refreshInvitations,

        // Phase 7 Universal Search, Saved Bookmarks & Pinned Modules
        savedItemIds,
        toggleSaveItem,
        refreshSavedItems,
        pinnedModules,
        togglePinModule,
        navigateToSearch,
        navigateToSavedItems,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
