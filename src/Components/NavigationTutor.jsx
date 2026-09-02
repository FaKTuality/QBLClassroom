import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../store/authProvider"
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { useNavigate } from "react-router-dom";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";
import { ProtRoutes } from "./ProtRoute";
import { signOut } from "firebase/auth";
import { auth } from "../../Firebase/index.js";
import { changeName } from "../store/topicConfigSlice";
import { useDispatch } from "react-redux";


// set notif if sign out failed

const errorMessages = {
  "auth/user-not-found":
    "No account exists with that email address.",

  "auth/wrong-password":
    "The password you entered is incorrect.",

  "auth/invalid-email":
    "Please enter a valid email address.",

  "auth/email-already-in-use":
    "An account with this email already exists.",

  "auth/weak-password":
    "Your password is too weak. Try using at least 6 characters.",

  "auth/network-request-failed":
    "It looks like you're offline. Please check your internet connection and try again.",

  "auth/too-many-requests":
    "Too many attempts detected. Please wait a few minutes and try again.",

  "permission-denied":
    "You don't have permission to perform this action.",

  "not-found":
    "The requested information could not be found.",

  "unavailable":
    "Our servers are temporarily unavailable. Please try again later.",

  "deadline-exceeded":
    "The request took too long to complete. Please try again."
}



export const NavigationTutor = ProtRoutes( () => {

  const navigate = useNavigate()
  const dispatch = useDispatch(); 
  const { currentUser: user, loading: authLoading} = useAuth()
  const location = useLocation(); 
  const [openNav, setOpenNav ] = useState(false); 
  




  if(authLoading) {
    return (
      <div className="loader-container">
      <RevolvingDot 
        visible={true}
        height="80"
        width="80"
        color="orange"
      />
      </div>)
  }



  const handleClick = (route) => { 
    navigate(route); 
    openNav && toggleNav()
  }

const toggleNav = () => {
  setOpenNav(!openNav); 
}

  const handleSignOut = async () => {
    try {
      await signOut(auth);

      navigate("/navauth/signin");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  

  return(
    <div>
      <img src="../logoMobile.png" className="logo for-mobile"/>
      
      <div className={`for-mobile overlay ${!openNav && 'hidden'}`}></div>
      <div 
        onClick={toggleNav}
        className={`for-mobile hamburger ${openNav && 'hidden'}`}>
          ☰
      </div>
      <div 
        onClick={toggleNav}
        className={`for-mobile hamburger ${!openNav && 'hidden'} close-modal` }>&times;</div>
      <div className="flex-hori-space-between">
        <img src="../logo.png" className="logo for-desktop"/>
        <ul className={openNav? 'navtut_ul_open': 'navtut_ul'}>
          <li></li>
          <li onClick={() => handleClick('/navtut/tutordashboard')} 
          className={`nav_li ${location.pathname === '/navtut/tutordashboard' ? 'active' : 'inactive'} link`}>Dashboard</li>
          <li onClick={() => handleClick('/navtut/viewtopics')} 
          className={`nav_li ${location.pathname === '/navtut/viewtopics' ? 'active' : 'inactive'} link`}>Topics</li>
          <li onClick={() => handleClick('/navtut/students')} 
          className={`nav_li ${location.pathname === '/navtut/students' ? 'active' : 'inactive'} link`}>Students</li>  
          <li onClick={() => handleClick('/navtut/settings')} 
          className={`nav_li ${location.pathname === '/navtut/settings' ? 'active' : 'inactive'} link`}>Settings</li> 
          <li onClick={() => handleClick('/navtut/removeads')} 
          className={`nav_li ${location.pathname === '/navtut/removeads' ? 'active' : 'inactive'} link`}>Ads</li>                              
          <li onClick={handleSignOut}
          className={`nav_li button`}>Sign out</li>
          
        </ul>        
      </div>

    <hr className="for-desktop"></hr>

    <Outlet /> 
    </div>
  )
})


