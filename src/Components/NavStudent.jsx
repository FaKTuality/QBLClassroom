import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";
import { ProtRoutes } from "./ProtRoute";
import { signOut } from "firebase/auth";
import { auth } from "../../Firebase/index.js";











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
};







export const NavigationStudent = ProtRoutes( () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openNav, setOpenNav] = useState(false);
  const [ userDoc, setUserDoc ] = useState(null); 

  const { currentUser: user, loading: authLoading } = useAuth();
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    const fetchUserDocument = async () => {
      try {
        setError(null);

        const docRef = doc(db, `users/${userId}`);
        const docSnap = await getDoc(docRef);
        setUserDoc(docSnap.data())
      } catch (e) {
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserDocument();
  }, [userId]);

  if (authLoading || loading) {
    return (
      <div className="loader-container">
        <RevolvingDot
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
      </div>
    );
  }

  if (error) {
    return <div className="center_piece">{error}</div>;
  }

  const toggleNav = () => {
    setOpenNav(!openNav);
  };

  const handleClick = (route) => {
    navigate(route, { state: { userId, studentName: userDoc.name} });

    if (openNav) {
      toggleNav();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);

      navigate("/navauth/signin");
    } catch (error) {
      
    }
  };


  return (
    <>
      <img src="../logoMobile.png" className="logo for-mobile" />
      

      <div className={`for-mobile overlay ${!openNav && "hidden"}`}></div>

      <div
        onClick={toggleNav}
        className={`for-mobile hamburger ${openNav && "hidden"}`}
      >
        ☰
      </div>

      <div
        onClick={toggleNav}
        className={`for-mobile hamburger ${!openNav && "hidden"}`}
      >
        &times;
      </div>
      <div className="flex-hori-space-between">
      <img src="../logo.png" className="logo for-desktop" />
      <ul className={openNav ? "navtut_ul_open" : "navtut_ul"}>
        <li></li>


        <li
          onClick={() => handleClick("/navstu/studentdashboard")}
          className={`nav_li ${
            location.pathname === "/navstu/studentdashboard"
              ? "active"
              : "inactive"
          } link`}
        >
          Dashboard
        </li>

        <li
          onClick={() => handleClick("/navstu/viewtopicsstudent")}
          className={`nav_li ${
            location.pathname === "/navstu/viewtopicsstudent"
              ? "active"
              : "inactive"
          } link`}
        >
          Topics
        </li>

        <li
          onClick={() => handleClick("/navstu/settings")}
          className={`nav_li ${
            location.pathname === "/navstu/settings"
              ? "active"
              : "inactive"
          } link`}
        >
          Settings
        </li>

        <li onClick={handleSignOut}
          className={`nav_li button`}>Sign out</li>
      </ul>
    </div>
      <hr className="for-desktop" />

      <Outlet />
    </>
  );
});