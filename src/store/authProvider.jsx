import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../Firebase/index.js";
import { store } from "./store";
import { createContext, useState, useEffect, useContext } from "react";



export const AuthContext = createContext() ; 

export const AuthProvider = ({ children }) => {
  
  const [ currentUser, setCurrentUser ] = useState(null); 
  const [ loading, setLoading ] = useState(true); 
  const [ theme, setTheme ] = useState('light'); 

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {


    setCurrentUser(user);
    setLoading(false);
  });

  document.documentElement.dataset.theme = theme;
  
  return unsubscribe;
}, [theme]);
  return (
    <AuthContext.Provider value={{currentUser, loading, theme, setTheme}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const authData = useContext(AuthContext); 
  return authData

}