import { useState } from "react";
import { Notif } from "./Notif";
import { Formik, Form, Field } from "formik";
import {
  auth,
  db,
} from "../../Firebase/index.js";
import * as Yup from "yup";
import { ErrorMessage } from "formik";

import {
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  linkWithPopup,
  unlink,
  signInWithPopup,
  reauthenticateWithPopup,
  deleteUser,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { arrayRemove, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../store/authProvider";

// fix tutor deleting account before student preventing student from deleting account. 



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









const changePasswordSchema = Yup.object({
  currentPassword: Yup.string()
    .required("Please enter your current password."),

  newPassword: Yup.string()
    .required("Please enter a new password.")
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
    )
    .notOneOf(
      [Yup.ref("currentPassword")],
      "New password must be different from your current password."
    ),
    confirmNewPassword: Yup.string().oneOf([Yup.ref("newPassword")], 'passwords do not match').required('You need to confirm your password')
});


const passwordLinkSchema =  Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email is required."),

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

    confirmPassword: Yup.string().oneOf([Yup.ref('password')], 'passwords do not match').required('You need to confirm your password')
});


const accountDeleteSchema = Yup.object({
  email: Yup.string()
    .email("Enter a valid email")
    .required("Email is required"),

  password: Yup.string().required("Password is required"),
});






export default function Settings() {
  const [ message, setMessage ] = useState("");
  const [ showModal, setShowModal ] = useState(false);
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ showNotif2, setShowNotif2 ] = useState(false);   
  const [ showNotif3, setShowNotif3 ] = useState(false); 
  const [ providerType, setProviderType ] = useState(''); 
  const [ password, setPassword ] = useState('')
  const [ linking, setLinking ] = useState(false); 
  const [ unlinking, setUnlinking ] = useState(false); 
  const [ deleteAccount, setDeleteAccount ] = useState(false); 
  const [ deleting, setDeleting ] = useState(false); 
  const user = auth?.currentUser;
  const userEmail = user?.email || user?.providerData.find(p => p.email)?.email;
  const navigate = useNavigate(); 
  const { theme, setTheme } = useAuth(); 


const toggleTheme = () => {
  setTheme(theme === "light" ? "dark" : "light");
};


  const linkedProviders =
    user?.providerData.map((provider) => provider.providerId) || [];

  const canUnlink = linkedProviders.length > 1;    

  const changePassword = async (values, { resetForm, setSubmitting }) => {
    setMessage(''); 
    try {
      if (!user || !user?.email) {
        throw new Error(
          "Only email/password accounts can change passwords."
        );
      }

      const credential = EmailAuthProvider.credential(
        userEmail,
        values.currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, values.newPassword);

      setShowNotif3(true); 
      
      resetForm();
    } catch (e) {
      
      setMessage(  !navigator.onLine
      ? "You're currently offline. Please reconnect to the internet and try again."
      : errorMessages[e.code] ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false); 
    }
  };

  const linkAccount = async (providerId) => {
    setMessage(''); 
    setLinking(true);
    setProviderType(providerId); 
    try {
      let provider;

      switch (providerId) {
        case "google.com":
          provider = new GoogleAuthProvider();
          break;

        case "github.com":
          provider = new GithubAuthProvider();
          break;

        case "twitter.com":
          provider = new TwitterAuthProvider();
          break;

        default:
          throw new Error("Unknown provider.");
      }

      await linkWithPopup(user, provider);
      
      setShowNotif(true); 
      
    } catch (error) {
      setMessage(error.message);
    } finally{ 
      setLinking(false); 
    }
  };

  const unlinkAccount = async (providerId) => {
    setMessage(''); 
    setUnlinking(true); 
    setProviderType(providerId); 
    try {
      await unlink(user, providerId);
      
      setShowNotif2(true); 
    } catch (e) {
      setMessage(  !navigator.onLine
    ? "You're currently offline. Please reconnect to the internet and try again."
    : errorMessages[e.code] ?? "Something went wrong. Please try again.");
    } finally {
      setUnlinking(false); 
    }
  };

const linkEmailPassword = async (values, { resetForm, setSubmitting }) => {
  setMessage(''); 
  setProviderType('password')
  try {
    const credential = EmailAuthProvider.credential(
      values.email,
      values.password
    );

    await linkWithCredential(user, credential);
    
    setShowNotif(true); 

    resetForm();

    setShowModal(false);
  } catch (e) {
    setMessage(  !navigator.onLine
    ? "You're currently offline. Please reconnect to the internet and try again."
    : errorMessages[e.code] ?? "Something went wrong. Please try again.");
  } finally {
    setSubmitting(false); 
  }
};



const manageDelete = async () => {
 const providers =  user?.providerData.map((provider) => provider.providerId)
 const alts = providers.filter((provider) => provider !== 'password')
 if(providers.includes('password')){
  setDeleteAccount(true)
  
 } else {
    const provider = alts[0] === 'google.com' ? new GoogleAuthProvider() : 
    alts[0] === 'github.com' ?  new GithubAuthProvider() : new TwitterAuthProvider() 
    try {
      setMessage(''); 
      await reauthenticateWithPopup(auth?.currentUser, provider); 
      setDeleting(true); 
      if(window.location.pathname.match(/^(\/navstu)/)?.[0]){
        const docSnap = await getDoc(doc(db, "users", auth?.currentUser?.uid))
        const { name, tutorId } = docSnap.data()
        const docSnap2  = await getDoc(doc(db, "admin", tutorId))
        if (docSnap2.exists()) {
          await updateDoc(doc(db, "admin", tutorId), { students: arrayRemove({ studentName: name, studentId: auth?.currentUser.uid })})
        }
        
        await deleteDoc(doc(db, "users", auth?.currentUser?.uid))
      } else {
        await deleteDoc(doc(db, "admin", auth?.currentUser?.uid))  
      }      
      await deleteUser(auth?.currentUser); 
      
    } catch(e) {
      setMessage(  !navigator.onLine
    ? "You're currently offline. Please reconnect to the internet and try again."
    : errorMessages[e.code] ?? "Something went wrong. Please try again."); 
      
    } finally {
      setDeleting(false); 
    }    
  }
}

const handleDeleteEmail = async (values, { setSubmitting }) => {
  
  const credential = EmailAuthProvider.credential(
    values.email,
    values.password
  );
  try {
    await reauthenticateWithCredential(user, credential);  
    if(window.location.pathname.match(/^(\/navstu)/)?.[0]){
      const docSnap = await getDoc(doc(db, "users", auth?.currentUser?.uid))
      const { name, tutorId } = docSnap.data() 
      const docSnap2  = await getDoc(doc(db, "admin", tutorId))
      if (docSnap2.exists()) {
        await updateDoc(doc(db, "admin", tutorId), { students: arrayRemove({ studentName: name, studentId: auth?.currentUser?.uid })})
      }
      await deleteDoc(doc(db, "users", auth?.currentUser?.uid)) 
     } else {
      await deleteDoc(doc(db, "admin", auth?.currentUser?.uid))  
     }
      await deleteUser(auth?.currentUser); 
              
  } catch(e) {
    setMessage(  !navigator.onLine
    ? "You're currently offline. Please reconnect to the internet and try again."
    : errorMessages[e.code] ?? "Something went wrong. Please try again."); 
  } finally {
    setSubmitting(false); 
  }
    
}


  return (
    <div className="flex-hori">
    <div className="signin-page">
<div className="theme-slider centered">
  <span className="theme-slider-label">Light</span>

  <div className="theme-slider-track">
    <div className="theme-slider-thumb" onClick={toggleTheme}></div>
  </div>

  <span className="theme-slider-label">Dark</span>
</div>
      <div>
        <h2>Change Password</h2>
        {linkedProviders.includes("password") ? (
                <Formik
                  validationSchema={changePasswordSchema}
                  initialValues={{
                    currentPassword: "",
                    newPassword: "",
                    confirmNewPassword: "", 
                  }}
                  onSubmit={changePassword}
                >{({ isSubmitting }) => (<Form className="flex-vert">
                    <Field
                      name="currentPassword"
                      type="password"
                      placeholder="Current password"
                      className="textInput"
                    />

                    <ErrorMessage 
                      name="currentPassword"   
                      component="div"
                      className="error-message" />

                    <Field
                      name="newPassword"
                      type="password"
                      placeholder="New password"
                      className="textInput"
                    />

                  <ErrorMessage 
                    name="newPassword"   
                    component="div"
                    className="error-message" />

                    <Field
                      name="confirmNewPassword"
                      type="password"
                      placeholder="Confirm new password"
                      className="textInput"
                    />                    

                  <ErrorMessage 
                    name="confirmNewPassword"   
                    component="div"
                    className="error-message" />

                    <button 
                    className="auth-button"
                    type="submit"
                    disabled={isSubmitting}
                    >
                      {isSubmitting? 'changing...' : 'Change password'}
                    </button>
                  </Form>)}
                </Formik>
              ) : (
                <p>This account does not use a password.</p>
              )}


      </div>
      
              <p className="error-message">{message}</p>
      
      <h2>Linked Accounts</h2>
      <div className="flex-vert">
      <Provider
        name="Email"
        providerId="password"
        providerType={providerType}
        linked={linkedProviders.includes("password")}
        canUnlink={canUnlink}
        unlinkAccount={unlinkAccount}
        openModal={() => setShowModal(true)}
        linking={linking}
        unlinking={unlinking}
      />

      <Provider
        name="Google"
        providerId="google.com"
        providerType={providerType}
        linked={linkedProviders.includes("google.com")}
        canUnlink={canUnlink}
        linkAccount={linkAccount}
        unlinkAccount={unlinkAccount}
        linking={linking}
        unlinking={unlinking}
      />

      <Provider
        name="GitHub"
        providerId="github.com"
        providerType={providerType}
        linked={linkedProviders.includes("github.com")}
        canUnlink={canUnlink}
        linkAccount={linkAccount}
        unlinkAccount={unlinkAccount}
        linking={linking}
        unlinking={unlinking}
      />

      <Provider
        name="Twitter"
        providerId="twitter.com"
        providerType={providerType}
        linked={linkedProviders.includes("twitter.com")}
        canUnlink={canUnlink}
        linkAccount={linkAccount}
        unlinkAccount={unlinkAccount}
        linking={linking}
        unlinking={unlinking}
      />
      </div>
      

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Link Email Account</h2>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="close-modal"
            >
              &times;
            </button>

            <Formik
              initialValues={{
                email: "",
                password: "",
                confirmPassword: "", 
              }}
              onSubmit={linkEmailPassword}
              validationSchema={passwordLinkSchema}
            >{({ isSubmitting }) => (<Form className="flex-vert">
                <Field
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="textInput"
                />

              <ErrorMessage 
                name="email"  
                component="div"
                className="error-message" />

                <Field
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="textInput"
                />

              <ErrorMessage 
                name="password"  
                className="error-message" 
                component="div"
                />

                <Field
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  className="textInput"
                />                

                <ErrorMessage 
                  name="confirmPassword" 
                  component="div"
                  className="error-message" />

                <button type="submit" className="button centered" disabled={isSubmitting}>
                  {isSubmitting ? 'linking...' : 'link account'}
                </button>
              </Form>)}
            </Formik>
          </div>
        </div>
      )}
      <button onClick={manageDelete} className="auth-button" disabled={deleting}>{deleting ? "deleting account" : "delete account"}</button>
      { deleteAccount && 
        <div className="modal">
          <div className="modal-content">
            <h2>confirm deletion</h2>
            <button
              type="button"
              onClick={() => setDeleteAccount(false)}
              className="close-modal"
            >
              &times;
            </button>            
            <Formik
              initialValues={{
                email: "",
                password: "", 
              }}
              onSubmit={handleDeleteEmail}
              validationSchema={accountDeleteSchema}
            >{({ isSubmitting }) => (
            <Form className="flex-vert">
                <Field
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="textInput"
                />

              <ErrorMessage 
                name="email"  
                component="div"
                className="error-message" />

                <Field
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="textInput"
                />

              <ErrorMessage 
                name="password"  
                className="error-message" 
                component="div"
                />
                
                  
                <button type="submit" className="button centered" disabled={isSubmitting}>
                  {isSubmitting ? 'deleting...' : 'confirm delete'}
                </button>
              </Form>)}
            </Formik>
          </div>
        </div> 
      }

      {showNotif && <Notif operation='link-account' setShowNotif={setShowNotif} account={providerType}/>}
      {showNotif2 && <Notif operation='unlink-account' setShowNotif={setShowNotif2} account={providerType}/>}
      {showNotif3 && <Notif operation='change-password' setShowNotif={setShowNotif3} />}
    </div>
    </div>
  );
}

function Provider({
  name,
  providerId,
  providerType,
  linked,
  linkAccount,
  unlinkAccount,
  canUnlink,
  openModal,
  linking, 
  unlinking
}) {
  return (
    <div className="flex-hori-space-between option-text"> 
      <span>{name}</span>

      {linked ? (
        <>
          

          {canUnlink && (
            <button
              type="button"
              onClick={() => unlinkAccount(providerId)}
              className="button"
              disabled={unlinking || linking}
            >
              {unlinking && providerType === providerId ? 'Unlinking...' : 'Unlink'}
            </button>
          )}
        </>
      ) : (
        <>
          {providerId === "password" ? (
            <button
              type="button"
              onClick={openModal}
              className="button"
              disabled={linking || unlinking}
            >
              Link
            </button>
          ) : (
            <button
              type="button"
              onClick={() => linkAccount(providerId)}
              className="button"
              disabled={linking || unlinking}
            >
              {linking && providerType === providerId? 'Linking...' : 'Link'}
            </button>
          )}
        </>
      )}
    </div>
  );
}





