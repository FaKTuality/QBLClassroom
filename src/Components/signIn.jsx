import { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../../Firebase/index.js";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { RevolvingDot } from "react-loader-spinner";
import { reload } from "firebase/auth";
import { FaGoogle, FaGithub, FaTwitter } from "react-icons/fa";
import { sendEmailVerification } from "firebase/auth";


const errorMessages = {
  "auth/user-not-found":
    "No account exists with that email address.",

  "auth/wrong-password":
    "The password you entered is incorrect.",

  "auth/invalid-credential":
    "The email or password is incorrect.",

  "auth/invalid-email":
    "Please enter a valid email address.",

  "auth/email-already-in-use":
    "An account with this email already exists.",

  "auth/weak-password":
    "Your password is too weak. Try using at least 6 characters.",

  "auth/password-does-not-meet-requirements":
    "Your password does not meet the required security requirements.",

  "auth/missing-email":
    "Please enter your email address.",

  "auth/missing-password":
    "Please enter your password.",

  "auth/user-disabled":
    "This account has been disabled.",

  "auth/too-many-requests":
    "Too many attempts have been made. Please wait and try again later.",

  "auth/network-request-failed":
    "A network error occurred. Please check your internet connection.",

  "auth/operation-not-allowed":
    "This sign-in method is not enabled.",

  "auth/credential-already-in-use":
    "This credential is already associated with another account.",

  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",

  "auth/provider-already-linked":
    "This sign-in method is already linked to your account.",

  "auth/no-such-provider":
    "This sign-in method is not linked to your account.",

  "auth/popup-blocked":
    "The sign-in popup was blocked by your browser. Please allow popups and try again.",

  "auth/popup-closed-by-user":
    "The sign-in window was closed before the operation was completed.",

  "auth/cancelled-popup-request":
    "Another sign-in request is already in progress.",

  "auth/popup-operation-in-progress":
    "A sign-in popup is already in progress.",

  "auth/unauthorized-domain":
    "This website is not authorized to use Firebase Authentication.",

  "auth/requires-recent-login":
    "Please sign in again before performing this action.",

  "auth/invalid-api-key":
    "There is a problem with the Firebase configuration.",

  "auth/app-not-authorized":
    "This application is not authorized to use Firebase Authentication.",

  "auth/internal-error":
    "An internal authentication error occurred. Please try again.",

  "auth/quota-exceeded":
    "The authentication service limit has been exceeded. Please try again later.",

  "permission-denied":
    "You don't have permission to perform this operation.",

  "not-found":
    "The requested document could not be found.",

  "already-exists":
    "The document you're trying to create already exists.",

  "failed-precondition":
    "The operation cannot be completed in the current state.",

  "aborted":
    "The operation was interrupted. Please try again.",

  "unavailable":
    "The database service is temporarily unavailable. Please try again later.",

  "deadline-exceeded":
    "The request took too long to complete. Please try again.",

  "cancelled":
    "The operation was cancelled.",

  "resource-exhausted":
    "The database service has reached its usage limit. Please try again later.",

  "unauthenticated":
    "You need to sign in before performing this operation.",

  "invalid-argument":
    "Invalid information was provided for this operation.",

  "out-of-range":
    "The requested value is outside the allowed range.",

  "unimplemented":
    "This database operation is not supported.",

  "internal":
    "An internal database error occurred. Please try again.",

  "data-loss":
    "A database error occurred. Please try again later.",

  "unknown":
    "An unexpected database error occurred. Please try again."
};


const validationSchema = Yup.object({
  email: Yup.string()
    .email("Enter a valid email")
    .required("Email is required"),

  password: Yup.string().required("Password is required"),
});

const initialValues = {
  email: "",
  password: "",
};

export const SignIn = () => {

  const [ verify, setVerify ] = useState(false);   
  const navigate = useNavigate();
  const [ error, setError ] = useState(null); 
  const [ verifying, setVerifying ] = useState(false); 
  const [ name, setName ] = useState(null); 
  const [ notif, setNotif ] = useState(''); 
  const [ reset, setReset ] = useState(false); 
  const [ resent, setResent ] = useState(false); 
  const [ first, setFirst ] = useState(null); 
  const [ count, setCount ] = useState(60); 
  const [ count2, setCount2 ] = useState(0); 
  const [ refresh, setRefresh ] = useState(verify && true)



const createTutor = async (user, name) => {
    const inviteId = crypto.randomUUID();

    const tutorDocument = {
      inviteDoc: inviteId,
      students: [{
        studentId: crypto.randomUUID(),
        studentName: "Alex Doe",
      },],
      uid: user.uid,
      email: user.email,
      role: "tutor",
      createdAt: serverTimestamp(),
      displayName: name,
    };

    await Promise.all([
      setDoc(doc(db, `admin/${inviteId}`), {
        tutorId: user.uid,
      }),
      setDoc(doc(db, "admin", user.uid), tutorDocument),
    ]);

    navigate("/navtut/tutordashboard");
  };

  const createStudent = async (user, name, inviteDoc) => {
    const studentDocument = {
      uid: user.uid,
      email: user.email,
      role: "student",
      createdAt: serverTimestamp(),
      name,
    };

    const studentObj = {
      studentName: name,
      studentId: user.uid,
    };

    const inviteRef = doc(db, `admin/${inviteDoc}`);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error("Invalid invite link.");
    }

    const { tutorId } = inviteSnap.data();

    await Promise.all([
      setDoc(doc(db, `users/${user.uid}`), studentDocument),
      updateDoc(doc(db, `admin/${tutorId}`), {
        students: arrayUnion(studentObj),
      }),
    ]);
    
    navigate("/navstu/studentdashboard");
  };



  const routeUser = async (uid) => {
    console.log('routeUser is running')
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
      console.log('navigating you to student dashboard')
      navigate("/navstu/studentdashboard")
    } else {
      console.log('navigating you to tutor dashboard')
      navigate("/navtut/tutordashboard")  
    }
  };
  

  const handleSubmit = async (values, { setSubmitting, setStatus }) => {
    setStatus(null);
    
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      
      if(credential.user.emailVerified) {
        console.log('youre email verified, so proceed')
        await routeUser(credential.user.uid);        
      } else {
        console.log('you"re not email verified, so i send a verification email')
        await sendEmailVerification(auth.currentUser);
        setVerify(true); 
        setFirst(true); 
        const intervalId = setInterval(timer, 1000)
        setTimeout(() => {
          clearInterval(intervalId)
          }, 60000)        
        }
    } catch (e) {
      console.log(e)
      setStatus(  !navigator.onLine
      ? "You're currently offline. Please reconnect to the internet and try again."
      : errorMessages[e.code] ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const timer = () => {
    setCount((count) => count - 1)
  }
  const timer2 = () => {
    setCount2((count) => count - 1)
  }

  const handleVerif = async () => {
    setVerifying(true); 
    setError(null); 
    
    try {
        const promises = await Promise.all([reload(auth.currentUser), getDoc(doc(db, "persistentInfo", auth.currentUser.uid))])
        const { name, inviteDoc } = promises[1].data() || {} 
    

      if(auth.currentUser.emailVerified) {
        if (inviteDoc) {
          await createStudent(auth.currentUser, name, inviteDoc);
          
        } else {
          await createTutor(auth.currentUser, name);
          
        }
      } else {
        setError("Please verify your email first.");
        return;
      }
    } catch (error) {  
      console.error(error)
      setError(error.message);
    } finally {
      setVerifying(false); 
    }
  };  

  const handleReset = async (values, { setStatus, setSubmitting }) => {
    setStatus(null);
    setCount2(60)
    try {
      await sendPasswordResetEmail(auth, values.email);

      setNotif("A password reset link has been sent to your email.");
      const intervalId = setInterval(timer2, 1000)
      setTimeout(() => {
        clearInterval(intervalId)
      }, 60000)      
    } catch (e) {
      setStatus(
        errorMessages[e.code] ?? "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };


  const handleResend = async () => {
    setError(null); 
    setResent(false); 
    setFirst(false); 
    setRefresh(false); 
    setCount(60)
    
    try {
      await sendEmailVerification(auth.currentUser);
      const intervalId = setInterval(timer, 1000)
      setTimeout(() => {
        clearInterval(intervalId)
      }, 60000)
      setResent(true); 
    } catch(e) {
      setError(e.message); 
    }
  }



  const handleProviderSignIn = async (provider) => {
    try {
      const credential = await signInWithPopup(auth, provider);
      await routeUser(credential.user.uid);
    } catch (error) {
      alert(error.message);
        
  
  
    }
  };

  useEffect(()=> {
    if(refresh){
      const intervalId = setInterval(timer, 1000)
      setTimeout(() => {
        clearInterval(intervalId)
      }, 60000)
    }



  }, [])


  if(verify) {
    return(
      <div className="signin-page centered">
        <h2>Verify your account</h2>
        { (first || refresh) &&
        <p>
          A verification link has been sent to your account. 
          Click on continue after following the link 
        </p>    
        }      
        { resent && 
          <p>
            Another link has been sent. Follow the link and 
            click on continue afterwards. 
        </p> 
        }
        { !resent && !first  && !refresh &&
          <div className="loader-container">
            <RevolvingDot
              visible={true}
              height="80"
              width="80"
              color="orange"
            />
          </div>
        }
        
        <button className="auth-button" disabled={verifying} onClick={handleVerif}>
          {verifying ? 'setting up...': 'continue'}
        </button>
        { error && (<div className="error-message">{error}</div>)}
      <button
        onClick={handleResend}
        style={{ color: `${count > 0 ? 'grey' : 'orange'}`, cursor: 'pointer'}}
        disabled={count > 0 }
      >resend link</button>
      {<div style={{color: 'red'}}>You can resend a link in {`00:${count}`}</div>}
      </div>
    )
  } 


if(reset) {
  return(<Formik
    initialValues={{
      email: ""
    }}
    validationSchema={Yup.object({
      email: Yup.string()
        .email("Enter a valid email address")
        .required("Email is required")
    })}
    onSubmit={handleReset}
  >
    {({
      values,
      errors,
      touched,
      handleChange,
      handleBlur,
      handleSubmit,
      isSubmitting
    }) => (
      <form onSubmit={handleSubmit} className="signin-page centered">
        <h2>Forgot your password?</h2>
        { notif && <p>A password reset link has been sent to your email</p>}
        { isSubmitting &&
          <div className="loader-container">
            <RevolvingDot
              visible={true}
              height="80"
              width="80"
              color="orange"
            />
          </div>
        }
        <Field
          className='textInput'
          placeholder="enter your email"
          name="email"
          type="email"
          label="Email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email && Boolean(errors.email)}
          helperText={touched.email && errors.email}
          
        />
        {touched.email && errors.email && (
          <div className="error-message">
            {errors.email}
          </div>
        )}
          <button
            className="auth-button"
            type="submit"
            disabled={isSubmitting || count2 > 0 }
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        {notif && <div style={{color: 'red'}}>You can resend a link in {`00:${count2}`}</div>}     

      </form>
    )}
  </Formik>
  )

}



  return (
    <div className="flex-hori">
      
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          validateOnChange
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, status }) => (
            <Form className="signin-page">
              <h2>Log In</h2>


                <button
                  type="button"
                  className="auth-button button-centered"
                  onClick={() =>
                    handleProviderSignIn(new GoogleAuthProvider())
                  }
                >
                  <div className="flex-hori">                   
                  <FaGoogle />&nbsp;
                  Continue with Google
                  </div>
                </button>

                <button
                  type="button"
                  className="auth-button button-centered"
                  onClick={() =>
                    handleProviderSignIn(new GithubAuthProvider())
                  }
                >
                  <div className="flex-hori">                  
                  <FaGithub />&nbsp;
                  Continue with GitHub
                  </div>
                </button>

                <button
                  type="button"
                  className="auth-button button-centered"
                  onClick={() =>
                    handleProviderSignIn(new TwitterAuthProvider())
                  }
                >
                  <div className="flex-hori">
                  <FaTwitter /> &nbsp;
                  Continue with Twitter
                  </div>
                </button>

                  <div
                    className="or"
                  >
                    <div className="hr"><hr /></div>
                    <span>or</span>
                    <div className="hr"><hr /></div>
                  
                  </div>

              <div className="label-input-pair-vertical">
                <label htmlFor="email">Email</label>

                <Field
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="textInput"
                />

                <ErrorMessage
                  name="email"
                  component="div"
                  className="error-message"
                />
              </div>

              <div className="label-input-pair-vertical">
                <label htmlFor="password">Password</label>

                <Field
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="textInput"
                />

                <ErrorMessage
                  name="password"
                  component="div"
                  className="error-message"
                />
              </div>

              {status && (
                <div className="error-message">
                  {status}
                </div>
              )}

                <button
                  type="submit"
                  className="auth-button button-centered"
                  
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </button>
                <button
                  onClick={() => setReset(true)}
                  style={{ color: 'orange', cursor: 'pointer'}}
                  disabled={reset}
                >reset password</button>
              
              
            </Form>
          )}
        </Formik>
      
    </div>
  );
};

export default SignIn;