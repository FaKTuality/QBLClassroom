import { Routes, Route } from "react-router-dom";
import { QuestionForm } from "./Components/QuestionForm";
import { ViewTopics } from "./Components/ViewTopics";
import { TopicMembers } from "./Components/TopicMembers";
import { TopicQuestions } from "./Components/TopicQuestions";
import { Submissions } from "./Components/Submissions";
import { ViewTopicsStudent } from "./Components/ViewTopicsStudent";
import SignIn from "./Components/signIn";
import SignUp from "./Components/signUp";
import { TutorDashboard } from "./Components/TutorDashboard";
import { StudentDashboard } from "./Components/StudentDashboard";
import { Home } from "./Components/Home";
import { NavigationTutor } from "./Components/NavigationTutor";
import { NavigationStudent } from "./Components/NavStudent";
import { NavigationAuth } from "./Components/NavAuth";
import { ClassRoom } from "./Components/ClassRoom.jsx";
import { AccessRestricted } from "./Components/accessRestricted";
import  Settings  from './Components/Settings'
import { Students } from "./Components/Students";
import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { useDispatch } from "react-redux";
import { changeName, changeTopic } from "./store/topicConfigSlice";
import { db } from "../Firebase/index.js";
import RemoveAds from "./Components/RemoveAds.jsx";
import { auth } from "../Firebase/index.js";
import { useAuth } from "./store/authProvider";
import './App.css'

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

const App = () => {
  const dispatch = useDispatch(); 
  const [ error, setError ] = useState(null); 
  const { currentUser: user, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if(authLoading || !user) return; 
    const fetchChangedNames = async () => {
      console.log("running effect function")
      try {
        console.log(user); 
        const docRef = doc(db, "admin", user.uid)
        
        const docRef2 = doc(db, "users", user.uid)
        
        const docSnap = await getDoc(docRef);   
        
        if(!docSnap.exists()){
          const docSnap2 = await getDoc(docRef2); 
          const { tutorId } = docSnap2.data() || {}
          if(tutorId) {
            const docSnap3 = await getDoc(doc(db, "admin", tutorId))
            const { changedTopics } = docSnap3.data() || {}
            
            dispatch(changeTopic(changedTopics))
            console.log("I have dispatched changed topics for the student", changedTopics)
          }
        } else {
          const { changedNames, changedTopics } = docSnap.data() || {}
          dispatch(changeName(changedNames))
          dispatch(changeTopic(changedTopics))
        }

      } catch(e) {
        console.log(e)
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );        
      }
    }
    fetchChangedNames(); 

  }, [authLoading, user])


  if (error) {
    return <p className="center_piece">{error}</p>;
  }



  return (
    <Routes>
      <Route path="/accessrestricted" element={<AccessRestricted />} />
      <Route path="/navauth" element={<NavigationAuth />}>
        <Route path="signup/:inviteDoc" element={<SignUp />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="signin" element={<SignIn />} />   
      </Route>

      <Route path="/" element={<Home />} />   
      <Route  path="/navstu" element={<NavigationStudent />} >     
      <Route path="settings" element={<Settings />} />   
        <Route path="studentdashboard" element={<StudentDashboard />} />
        <Route path="viewtopicsstudent" element={<ViewTopicsStudent />} />
        <Route path="classroom" element={<ClassRoom />} />
      </Route>
      <Route  path="/navtut" element={<NavigationTutor />} > 
        <Route path="students" element={<Students />} />
        <Route path="settings" element={<Settings />} />
        <Route path="tutordashboard" element={<TutorDashboard />} />
        <Route path="questionForm" element={<QuestionForm />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="topicmembers" element={<TopicMembers />} />
        <Route path="topicquestions" element={<TopicQuestions />} />
        <Route path="viewtopics" element={<ViewTopics />} />
        <Route path="removeads" element={<RemoveAds />} /> 


      </Route>
    </Routes>
  );
};

export default App;