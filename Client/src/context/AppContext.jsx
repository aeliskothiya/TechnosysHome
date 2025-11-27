import React, { createContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io as ioClient } from "socket.io-client";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {

  // ⬅ Backend URL (safe fallback)
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL ||
    "https://technosyshome-server.onrender.com";
    

  // ⬅ MOST IMPORTANT: Set axios base URL globally
  axios.defaults.baseURL = backendUrl;
  axios.defaults.withCredentials = true;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const socketRef = useRef(null);
  const subscribersRef = useRef({});

  /* ------------------------------
      AUTH CHECK
  --------------------------------*/
  const getAuthState = async () => {
    try {
      const { data } = await axios.get("/api/auth/is-auth");

      if (data.success) {
        setIsLoggedIn(true);
        await getUserData();
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setIsLoggedIn(false);
        setUserData(null);
      } else {
        toast.error(error.response?.data?.message || "Authentication failed");
      }
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    getAuthState();
  }, []);

  /* ------------------------------
      SOCKET.IO SETUP
  --------------------------------*/
  useEffect(() => {
    try {
      const s = ioClient(backendUrl, {
        withCredentials: true,
        transports: ["websocket"], // ⬅ Required for Render
      });

      socketRef.current = s;

      s.on("connect", () => console.log("Realtime connected:", s.id));

      s.on("db_change", (payload) => {
        const model = payload?.model || "*";
        const subs = subscribersRef.current[model];
        subs?.forEach((cb) => cb(payload));

        const wild = subscribersRef.current["*"];
        wild?.forEach((cb) => cb(payload));
      });

      s.on("disconnect", () => console.log("Realtime disconnected"));

      return () => s.disconnect();

    } catch (err) {
      console.warn("Socket init failed:", err);
    }
  }, [backendUrl]);

  /* ------------------------------
      USER DATA FETCH
  --------------------------------*/
  const fetchUserData = async () => {
    try {
      const res = await axios.get("/api/auth/me");
      if (res.data.success) setUserData(res.data.user);
    } catch {}
  };

  const getUserData = async () => {
    try {
      const { data } = await axios.get("/api/user/data");

      if (data.success) {
        const u = data.UserData || data.userData;
        setUserData(u);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch user data");
    }
  };

  /* ------------------------------
      REALTIME UTILS
  --------------------------------*/
  const realtimeSubscribe = (modelName, cb) => {
    if (!modelName || typeof cb !== "function") return () => {};
    if (!subscribersRef.current[modelName]) {
      subscribersRef.current[modelName] = new Set();
    }
    subscribersRef.current[modelName].add(cb);
    return () => realtimeUnsubscribe(modelName, cb);
  };

  const realtimeUnsubscribe = (modelName, cb) => {
    const map = subscribersRef.current;
    if (!map[modelName]) return;
    map[modelName].delete(cb);
    if (map[modelName].size === 0) delete map[modelName];
  };

  return (
    <AppContext.Provider
      value={{
        backendUrl,
        isLoggedIn,
        setIsLoggedIn,
        userData,
        setUserData,
        getUserData,
        fetchUserData,
        loadingUser,
        realtimeSubscribe,
        realtimeUnsubscribe,
        socket: socketRef.current,
        axios,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
