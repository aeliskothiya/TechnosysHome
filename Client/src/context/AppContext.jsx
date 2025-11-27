import React, { createContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io as ioClient } from "socket.io-client";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  axios.defaults.withCredentials = true;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const socketRef = useRef(null);
  const subscribersRef = useRef({}); // { modelName: Set(callback) }

  const getAuthState = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/is-auth`, {
        withCredentials: true,
      });

      if (data.success) {
        setIsLoggedIn(true);
        await getUserData();
      }
    } catch (error) {
      // Handle 401 errors gracefully (user not logged in)
      if (error.response?.status === 401) {
        setIsLoggedIn(false);
        setUserData(null);
      } else {
        // Only show other errors
        toast.error(error.response?.data?.message || "Authentication failed");
      }
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    getAuthState();
  }, []);

  useEffect(() => {
    // Initialize socket connection
    try {
      const s = ioClient(backendUrl, { withCredentials: true });
      socketRef.current = s;

      s.on('connect', () => {
        console.log('Realtime: connected', s.id);
      });

      s.on('db_change', (payload) => {
        // Notify specific model subscribers
        const model = payload?.model || '*';
        const subs = subscribersRef.current[model];
        if (subs) {
          subs.forEach((cb) => {
            try { cb(payload); } catch (e) { console.error('subscriber error', e); }
          });
        }
        // Notify wildcard subscribers
        const wild = subscribersRef.current['*'];
        if (wild) {
          wild.forEach((cb) => {
            try { cb(payload); } catch (e) { console.error('subscriber error', e); }
          });
        }
      });

      s.on('disconnect', () => console.log('Realtime: disconnected'));

      return () => {
        try { s.disconnect(); } catch (e) { }
        socketRef.current = null;
      };
    } catch (err) {
      console.warn('Realtime init failed', err);
    }
  }, [backendUrl]);

  // Subscribe to realtime DB changes for a model. Use modelName='*' for all events.
  const realtimeSubscribe = (modelName, cb) => {
    if (!modelName || typeof cb !== 'function') return () => { };
    const map = subscribersRef.current;
    if (!map[modelName]) map[modelName] = new Set();
    map[modelName].add(cb);
    return () => realtimeUnsubscribe(modelName, cb);
  };

  const realtimeUnsubscribe = (modelName, cb) => {
    const map = subscribersRef.current;
    if (!map[modelName]) return;
    map[modelName].delete(cb);
    if (map[modelName].size === 0) delete map[modelName];
  };
  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/auth/me`, {
        withCredentials: true,
      });

      if (res.data.success) {
        setUserData(res.data.user);
      }
    } catch (err) {
      console.log("User refresh failed");
    }
  };

  const getUserData = async () => {
    try {
      //   const { data } = await axios.get(`${backendUrl}/api/user/data`);
      const { data } = await axios.get(`${backendUrl}/api/user/data`, {
        withCredentials: true,
      });
      console.log("Full user data response:", data); // More detailed log
      if (data.success) {
        // Handle both UserData and userData properties
        const userData = data.UserData || data.userData;
        setUserData(userData);
        // Store user role in context or localStorage if needed
        // localStorage.setItem("userRole", userData.role || "technician");
        console.log("AppContext userData:", userData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch user data");
    }
  };

  const value = {
  backendUrl,
  isLoggedIn,
  setIsLoggedIn,
  userData,
  setUserData,
  getUserData,
  fetchUserData,       // ⭐ ADD THIS
  loadingUser,
  realtimeSubscribe,
  realtimeUnsubscribe,
  socket: socketRef.current,
};



  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

