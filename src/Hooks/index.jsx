import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import React from "react";


export const useThreeDots = () => {
  const [ showOptions, setShowOptions ] = useState({
    id: null,
    show: null,
  }); 
  const randomClick = () => {
    setShowOptions({
      id: null, 
      show: showOptions.show, 
    })
  }  

  const handleShowOptions = (id) => {
    setShowOptions({
      id: id, 
      show: showOptions.id === id || 
      showOptions.show === null ? !showOptions.show : showOptions.show
    })
  }  

  return {
    showOptions, 
    setShowOptions, 
    randomClick, 
    handleShowOptions,
  }


}

export const useNameChange = () => {
  const changedNames = useSelector((state) => state.topicConfig.changedNames)
  return changedNames

}


export const useTopicChange = () => {
  const changedTopics = useSelector((state) => state.topicConfig.changedTopics)
  return changedTopics
}





export function usePasswordVisibility() {
  
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return {
    showPassword,
    passwordType: showPassword ? "text" : "password",
    togglePasswordVisibility,
  };
}

export function usePasswordVisibility2() {
  const [showPassword2, setShowPassword2] = useState(false);

  const togglePasswordVisibility2 = () => {
    setShowPassword2((prev) => !prev);
  };

  return {
    showPassword2,
    passwordType2: showPassword2 ? "text" : "password",
    togglePasswordVisibility2,
  };
}

const readLocks = (storageKey) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
 
// Tracks "locked until" timestamps per question, so a wrong answer on question 3
// only blocks question 3. Timestamps (not remaining seconds) are stored, so the
// lock survives a refresh and keeps counting while the student is on another
// question. The interval runs only while at least one lock is still active.
export const usePenaltyLock = (storageKey) => {
  const [locks, setLocks] = useState(() => readLocks(storageKey));
  const [now, setNow] = useState(() => Date.now());
 
  const hasActiveLock = Object.values(locks).some((until) => until > now);
 
  useEffect(() => {
    if (!hasActiveLock) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [hasActiveLock]);
 
  const startLock = (questionId, seconds) => {
    if (!(seconds > 0)) return;
    const current = Date.now();
    const next = { ...locks, [questionId]: current + seconds * 1000 };
    setNow(current);
    setLocks(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage unavailable: the lock still works for this page load */
    }
  };
 
  const remainingMs = (questionId) => Math.max(0, (locks[questionId] ?? 0) - now);
 
  const clearLocks = () => {
    setLocks({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* nothing to clean up */
    }
  };
 
  return { startLock, remainingMs, clearLocks };
};