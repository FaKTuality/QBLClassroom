import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../store/authProvider"
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { useNavigate } from "react-router-dom";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/authProvider";







export const NavigationAuth = () => {

  const navigate = useNavigate()
  const location = useLocation(); 
  const [openNav, setOpenNav ] = useState(false); 

 


  const handleClick = (route) => { 
    navigate(route); 
    openNav && toggleNav()
  }

const toggleNav = () => {
  setOpenNav(!openNav); 
}



  return(
    <>
      <img src="/logoMobile.png" alt="image not available" className="logo for-mobile"/>
      
      <div className={`for-mobile overlay ${!openNav && 'hidden'}`}></div>
      <div 
        onClick={toggleNav}
        className={`for-mobile hamburger ${openNav && 'hidden'}`}>
          ☰
      </div>
      <div 
        onClick={toggleNav}
        className={`for-mobile hamburger ${!openNav && 'hidden'} close-modal`}>&times;</div>
      <div className="flex-hori-space-between">
      <img src="/logo.png" className="logo for-desktop"/>
      <ul className={openNav? 'navtut_ul_open': 'navtut_ul'}>
        <li></li>
        <li onClick={() => handleClick('/')} 
        className={`nav_li ${location.pathname === '/' ? 'active' : 'inactive'} link`}>Home</li>
        <li onClick={() => handleClick('/navtut/tutordashboard')} 
        className={`nav_li ${location.pathname === '/navtut/tutordashboard' ? 'active' : 'inactive'} link`}>features</li>
        <li onClick={() => handleClick('/navtut/viewtopics')} 
         className={`nav_li ${location.pathname === '/navtut/viewtopics' ? 'active' : 'inactive'} link`}>pricing</li>
        <li onClick={() => handleClick('/settings')} 
        className={`nav_li ${location.pathname === '/settings' ? 'active' : 'inactive'} link`}>FAQs</li>
        <li onClick={() => handleClick('/navauth/signup')} 
         className={`nav_li ${location.pathname === '/navauth/signup' ? 'active' : 'inactive'} link`}>sign up</li>
        
      </ul>
      </div>
    <hr className="for-desktop"></hr>

    <Outlet /> 
    </>
  )
}