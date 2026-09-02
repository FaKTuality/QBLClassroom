import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  sendEmailVerification,
  reload,
  signInWithCredential,
} from "firebase/auth";
import { auth, db } from "../../Firebase/index.js";
import {
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  arrayUnion,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { RevolvingDot } from "react-loader-spinner";
import { FaGithub, FaGoogle, FaTwitter } from "react-icons/fa";


const errorMessages = {
  "auth/user-not-found":
    "No account exists with that email address.",

  "auth/wrong-password":
    "The password you entered is incorrect.",

  "auth/invalid-email":
    "Please enter a valid email address.",

  "auth/email-already-in-use":
    "An account with this email already exists. Please sign in",

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



const initialValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const validationSchema = Yup.object({
  name: Yup.string().required("Your name is required"),

  email: Yup.string()
    .email("Enter a valid email")
    .required("Email is required"),

  password: Yup.string()
    .required("Please enter a password.")
    .min(8, "Password must be at least 8 characters long.")
    .matches(
      /[a-z]/,
      "Password must contain at least one lowercase letter."
    )
    .matches(
      /[A-Z]/,
      "Password must contain at least one uppercase letter."
    )
    .matches(
      /[0-9]/,
      "Password must contain at least one number."
    ),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

export const SignUp = () => {
  
  const [ verify, setVerify ] = useState(false); 
  const { inviteDoc } = useParams();
  const [ error, setError ] = useState(null); 
  const [ verifying, setVerifying ] = useState(false); 
  const [ name, setName ] = useState(null); 
  const [ resent, setResent ] = useState(false); 
  const [ first, setFirst ] = useState(null); 
  const [ count, setCount ] = useState(60); 
  const [ refresh, setRefresh ] = useState(verify && true)
  const navigate = useNavigate();

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

  const createStudent = async (user, name) => {
    const inviteRef = doc(db, `admin/${inviteDoc}`);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error("Invalid invite link.");
    }

    const { tutorId } = inviteSnap.data();

    const studentDocument = {
      uid: user.uid,
      email: user.email,
      role: "student",
      createdAt: serverTimestamp(),
      name,
      tutorId,
    };

    const studentObj = {
      studentName: name,
      studentId: user.uid,
    };
    await Promise.all([
      setDoc(doc(db, `users/${user.uid}`), studentDocument),
      updateDoc(doc(db, `admin/${tutorId}`), {
        students: arrayUnion(studentObj),
      }),
    ]);
    
    navigate("/navstu/studentdashboard");
  };

  const timer = () => {
    setCount((count) => count - 1)
  }

  const onSubmit = async (values, { setSubmitting, setStatus, resetForm}) => {
    setStatus(null); 
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password);
        await sendEmailVerification(credential.user); 
        const intervalId = setInterval(timer, 1000)
        setTimeout(() => {
          clearInterval(intervalId)
      }, 60000)
        setFirst(true); 
        setName(values.name)
        await setDoc(doc(db, "persistentInfo", credential.user.uid), inviteDoc ? { name: values.name, inviteDoc, verify: true} : { name: values.name, verify: true})
        setVerify(true); 
        resetForm(); 
    } catch(e) {
      console.log(e); 
      setStatus(  !navigator.onLine
    ? "You're currently offline. Please reconnect to the internet and try again."
    : errorMessages[e.code] ?? "Something went wrong. Please try again."); 
    } finally {
      setSubmitting(false); 
    }
  }

  

  const handleSubmit = async () => {
    setVerifying(true); 
    setError(null); 
    try {
      await reload(auth.currentUser)
      if(auth.currentUser.emailVerified) {
        if (inviteDoc) {
          await createStudent(auth.currentUser, name);
          
        } else {
          await createTutor(auth.currentUser, name);
          
        }
      } else {
        setError("Please verify your email first.");
        return;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setVerifying(false); 
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



  const handleProviderSignUp = async (provider) => {
    try {
      const credential = await signInWithPopup(auth, provider);

      const user = credential.user;

      const name = user.displayName || "User";

      if (inviteDoc) {
        await createStudent(user, name);
      } else {
        await createTutor(user, name);
      }
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
        
        <button className="auth-button" disabled={verifying} onClick={handleSubmit}>
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
  


  return (
    <div className="flex-hori">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        validateOnChange
        onSubmit={onSubmit}
      >
        {({ isSubmitting, status }) => (
          <Form className="signin-page">
            <h2>Create Account</h2>

            <button
              type="button"
              className="auth-button button-centered"
              onClick={() =>
                handleProviderSignUp(new GoogleAuthProvider())
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
                handleProviderSignUp(new GithubAuthProvider())
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
                handleProviderSignUp(new TwitterAuthProvider())
              }
            >
            <div className="flex-hori"> 
              <FaTwitter />&nbsp; 
              Continue with Twitter
            </div>
            </button>

            <div className="or">
              <div className="hr">
                <hr />
              </div>

              <span>or</span>

              <div className="hr">
                <hr />
              </div>
            </div>

            <div className="label-input-pair-vertical">
              <label htmlFor="name">First Name</label>

              <Field
                id="name"
                name="name"
                placeholder="Enter your name"
                className="textInput"
              />

              <ErrorMessage
                name="name"
                component="div"
                className="error-message"
              />
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

            <div className="label-input-pair-vertical">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <Field
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="textInput"
              />

              <ErrorMessage
                name="confirmPassword"
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
              {isSubmitting
                ? "Creating Account..."
                : "Create Account"}
            </button>

            <p>
              Already have an account?{" "}
              <Link to="/navauth/signin">Sign In</Link>
            </p>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SignUp;


const verifyEmail = () => {
  const handleVerified = () => {

  }

  return(
    <div>
      <p>
        A verification email has been sent to you
      </p>
    </div>
  )
}