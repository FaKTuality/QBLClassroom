import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";


export const NavigationAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openNav, setOpenNav] = useState(false);
  const [ currRoute, setRoute ] = useState(null); 

  const handleClick = (route) => {
    navigate(route);
    setRoute(route);  
    console.log("route", route); 
    if (openNav) toggleNav();
  };

const toggleNav = () => setOpenNav(prev => !prev);

  const isHome = currRoute === ("/#home" || "/");
  const isFeatures = currRoute === "/#features"
  const isPricing = currRoute === "/#pricing"
  const isFaqs = currRoute === "/#faqs"

  return (
    <>
      <img src="/logoMobile.png" alt="image not available" className="logo for-mobile" />

      <div onClick={toggleNav} className={`for-mobile overlay ${!openNav && "hidden"}`}></div>

      <div onClick={toggleNav} className={`for-mobile hamburger ${openNav && "hidden"}`}>
        ☰
      </div>

      <div onClick={toggleNav} className={`for-mobile hamburger ${!openNav && "hidden"} close-modal-nav`}>
        &times;
      </div>

      <div className="flex-hori-space-between">
        <img src="/logo.png" className="logo for-desktop" />

        <ul className={openNav ? "navtut_ul_open" : "navtut_ul"}>
          <li></li>
          <li onClick={() => handleClick("/#home")} className={`nav_li ${isHome ? "active" : "inactive"} link`}>
            Home
          </li>
          <li onClick={() => handleClick("/#features")} className={`nav_li ${isFeatures ? "active" : "inactive"} link`}>
            Features
          </li>
          <li onClick={() => handleClick("/#pricing")} className={`nav_li ${isPricing ? "active" : "inactive"} link`}>
            Pricing
          </li>
          <li onClick={() => handleClick("/#faqs")} className={`nav_li ${isFaqs ? "active" : "inactive"} link`}>
            FAQs
          </li>
          <li
            onClick={() => handleClick("/navauth/signup")}
            className={`nav_li ${location.pathname === "/navauth/signup" ? "active" : "inactive"} link`}
          >
            Sign Up
          </li>
        </ul>
      </div>

      <hr className="for-desktop" />
      <Outlet />
    </>
  );
};