
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from "../store/authProvider";
import { useContext, useEffect, useState } from "react";
import { Notif } from "./Notif";
import { useNavigate } from "react-router-dom";
import { db } from "../../Firebase/index.js";
import { TopicConfig } from "./TopicConfig";
import { useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";










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





export const TutorDashboard = () => {
  const navigate = useNavigate(); 
  const domain = window.location.origin; 

  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [ inviteDoc, setInviteDoc ] = useState(null); 
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ copyError, setCopyError ] = useState(null);
  const [ showModal, setShowModal ] = useState(false);  
  const [ tutorName, setTutorName ] = useState(null); 
  const { currentUser: user, loading: authLoading} = useAuth()
  const tutorId = user?.uid
 

  useEffect(() => {
    if(!tutorId){
      return
    }
    const fetchInviteDocId = async () => {
      try{
      setError(null); 
      const docRef = doc(db, `admin/${tutorId}`)
      
      const docSnap = await getDoc(docRef); 
      const { inviteDoc, displayName: tutorName }   = docSnap.data()
      
      setTutorName(tutorName)
      setInviteDoc(inviteDoc); 
      localStorage.removeItem("topicConfig")
      } catch(e) {
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );
      } finally {
        setLoading(false)
      }
    }
    fetchInviteDocId(); 


  }, [tutorId])

  if(authLoading) {
    return (
      <RevolvingDot
        visible={true}
        height="80"
        width="80"
        color="orange"
      />
    )
  }    

  const handleCopy = async (e) =>  {
    try{
      await navigator.clipboard.writeText(`${domain}/navauth/signup/${inviteDoc}`)
      setShowNotif(true); 
    } catch(e) {
      setCopyError(e.message); 
    }
    
  }

  const handleViewTopic = () => {
    navigate('/navtut/viewtopics')
  }

  const handleAddTopic = () => {
    localStorage.removeItem("topicConfig");
    localStorage.removeItem("questionInfo")    
    setShowModal(true); 
  }

  if(loading) {
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


  if(error) {
    return <p>{error}</p>
  }

  return (
    <div className="center_piece">
      { showNotif && <Notif operation="linkCopy" setShowNotif={setShowNotif} />}
      <h2 className="centered">{`Welcome ${tutorName}!`}</h2>
      <small className="centered" style={{color: '#FF6A00'}}>send a sign up link to your students</small>
      <div className="label-input-pair">
      <input
        readOnly
        value={`${domain}/signup/${inviteDoc}`}
        className="copyLink"
      />
      <button onClick={handleCopy} className="button">copy Link</button>
      {copyError && <div>{copyError}</div>}
      </div>
      
      <div className="listItem">
        <p onClick={handleViewTopic} className="button">View Topics</p>
        <img src="../viewTopics.png" alt="this image cannot be displayed" className="view-topics"/>
        <img src="../viewTopicsMobile.png" alt="this image cannot be displayed" 
        className="view-topics-mobile"/>
        
      </div>
      
      <div className="listItem">
        <p onClick={handleAddTopic} className="button">Add Topic</p>
        <img src="../addTopic.png" alt="this image cannot be displayed" className="add-topic"/>
        <img src="../addTopicMobile.png" alt="this image cannot be displayed" 
        className="add-topic-mobile"/>        
      </div>
      { showModal && <TopicConfig setShowModal={setShowModal} />}
    </div>
  )
}