import { useLocation, useNavigate } from "react-router-dom";
import { useThreeDots } from "../Hooks";
import { useEffect, useState } from "react";
import { collection, doc, getDocs, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { RevolvingDot } from "react-loader-spinner";
import { useAuth } from "../store/authProvider";
import { useNameChange, parseName } from "../Hooks";
import { useTopicChange, parseTopic, parseCode } from "../Hooks";

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



// per topic, per student management
// pass the topic name as a url param from view topics and
// fetch the students here. 
// actually, there's no need to do this. 
export const TopicMembers = () => {
  
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const { showOptions, setShowOptions, handleShowOptions, randomClick } = useThreeDots(); 
  const topicConfig = location.state;
  const students = topicConfig?.students;
  const topicName = topicConfig?.topicName; 
  const [loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [ submissions, setSubmissions ] = useState(null);
  const [ shuffleInfo, setShuffleInfo ] = useState([]); 
  const { currentUser: user, loading: authLoading} = useAuth()
  const changedNames = useNameChange(); 
  const changedTopics = useTopicChange(); 
  const handleQuestions = (topicInfo) => {
    navigate('/navtut/topicquestions', { state: topicInfo })
  }

  const handleSubmissions = (topicInfo) => {
    navigate('/navtut/submissions', { state: topicInfo })
  }


  const handleShuffle = async (studentId, studentIndex) => {
    
    const docRef = doc(db, "users", studentId, "topics", topicName)
    const currShuffleInfo = shuffleInfo
    const shuffle = !shuffleInfo[studentIndex]
    try {
      const midway = [...shuffleInfo];
      midway[studentIndex] = shuffle
      setShuffleInfo(midway)
      await updateDoc(docRef, { shuffle: shuffle })
    } catch(e) {
        setShuffleInfo(currShuffleInfo);
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );
    } 
  }

  useEffect(() => {
    
    const fetchSubmissions = async () => {
        try {
          
          const allPromises = students?.map((stud) => {
            const colRef = collection(db, 
              "users", stud.studentId, 
              "topics", topicName, 
              "submissions")            
              return getDocs(colRef)
          })

          const allPromises2 = students?.map((stud)=> {
            const docRef = doc(db, "users", stud.studentId, "topics", topicName)
            return getDoc(docRef); 
          })
          const allQuerySnap = await Promise.all(allPromises);
          const allDocSnaps = await Promise.all(allPromises2); 
          setSubmissions(allQuerySnap); 
          setShuffleInfo(allDocSnaps.map((docSnap) => docSnap.data().shuffle));
        } catch(e) {
          console.log(e)
          setError(
            !navigator.onLine
              ? "You're currently offline. Please reconnect to the internet and try again."
              : errorMessages[e.code] ?? "Something went wrong. Please try again."
          );
        } finally {
          setLoading(false); 
        }
    }

    fetchSubmissions(); 
  }, [])

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


  return(
    <div className="center_piece">
    <h3 className="centered">Students with access to {parseCode(parseTopic(topicName, changedTopics))}</h3>
      
        {students?.map((student, studentIndex) => 
        <div key={student.studentId} className="listItem relative" onClick={randomClick}>
        <div className="three-dots for-mobile"
          onClick={(e) => {
            e.stopPropagation(); 
            handleShowOptions(student.studentId)
          }}
        >⋮</div>          
          <div 
            className={`${submissions[studentIndex].docs.length === 0 ? 'red' : 'green'}`}
          >{parseName(student.studentName, student.studentId, changedNames)}</div>
          <div className="theme-slider centered">
            <span className="theme-slider-label">off</span>
            <div className="theme-slider-track">
              <div className={`${shuffleInfo[studentIndex] ? 'turnedOn' : 'turnedOff'}`} onClick={() => handleShuffle(student.studentId, studentIndex)}></div>
            </div>
            <span className="theme-slider-label">Shuffle on</span>
        </div>
          <div 
            className={showOptions.id === student.studentId && showOptions.show ? 'action-group' : 'buttonPair'}>
              <button onClick={() => handleQuestions({ studentId: student.studentId, topicName, students, name: student.studentName })}
                  className={`${showOptions.id === student.studentId && showOptions.show ? 'action' : 'button'}`} 
                  >View questions</button>    
              <button 
                disabled={submissions[studentIndex].docs.length === 0}
                onClick={() => handleSubmissions({ studentId: student.studentId, topicName, students, studentName: student.studentName })}
                  className=
                  {`${showOptions.id === student.studentId && showOptions.show ? 'action' : 'button'}`} 
                >View Submissions</button>
          </div>
          </div>


        )}

    
    </div>
  )
}