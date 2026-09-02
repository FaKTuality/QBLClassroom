import { useEffect, useState } from "react";
import { auth, db } from "../../Firebase/index.js";
import { useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { flushSync } from "react-dom";



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


export const ProtRoutes = (Component) => () => {
  const navigate = useNavigate(); 
  const [ valid, setValid ] = useState(false); 
  const { currentUser: user, loading: authLoading } = useAuth();
  const [ error, setError ] = useState(null); 
  


  useEffect(() => {

    if(authLoading) return; 
    const fetchUser = async () => {
      const docRef = doc(db, "users", user.uid);
      let role; 
      try {
        const docSnap = await getDoc(docRef); 
        if(!docSnap.exists()){
          role = 'tutor'
        } else {
          role = 'student';
        }
        
        if(window.location.pathname.match(/^(\/navtut)/)?.[0] && role !== 'tutor'){
          navigate('/accessrestricted')
          
        } else if(window.location.pathname.match(/^(\/navstu)/)?.[0] && role !== 'student'){
          navigate('/accessrestricted')
          
        } else {
         console.log("I'm setting valid to true")
          setValid(true); 
          
        }        
      } catch(e) {
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );
      }

    }

    if(!user || !auth.currentUser?.emailVerified) {
      if(!user){
        console.log('i am protroutes and i am re-routing you back to sign in because user is', user)
      } else {
        console.log('i am protroutes and i am re-routing you back to sign in because you are not email verified')
      }
      
      navigate('/navauth/signin')
      
    }
    if(auth.currentUser?.emailVerified){
      console.log("I'm fetching user")
      fetchUser()      
    }
    

  }, [user, navigate, authLoading])


if (error) {
  return (
    <div className="center_piece">
      <h2 className="header-centered">
        Something went wrong
      </h2>

      <div className="flex-vert">
        <p className="centered">
          We couldn't verify your account at the moment.
        </p>

        <p className="error-message centered">
          {error}
        </p>
      </div>

      <button
        className="button button-centered"
        onClick={() => window.location.reload()}
      >
        Reload page
      </button>
    </div>
  );
}


  
    return (

      <div className="centered">
      {!valid ? 
      <div className="loader-container ">
        <RevolvingDot 
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
      </div> : <Component />
      }
      
      </div>
      )
}