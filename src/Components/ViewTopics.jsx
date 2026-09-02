import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { useState, useEffect, useContext } from "react";
import { db } from "../../Firebase/index.js";
import { useNavigate } from "react-router-dom";
import { AuthContext, useAuth } from "../store/authProvider";
import { TopicConfig } from "./TopicConfig";
import { Notif } from "./Notif";
import { RevolvingDot } from "react-loader-spinner";
import { useTopicChange, parseTopic } from "../Hooks";
import { useDispatch } from "react-redux";
import { changeTopic } from "../store/topicConfigSlice";



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







export const ViewTopics = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch(); 
  const changedTopics = useTopicChange(); 
  const [ newName, setNewName ] = useState(''); 
  const [ topicName, setTopicName ] = useState(null);
  const [ changing, setChanging ] = useState(false); 
  const [ nameChangeErr, setNameChangeErr ] = useState(null);
  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(false); 
  const [ allTopics, setAllTopics ] = useState([]); 
  const [ showModal, setShowModal ] = useState(false);
  const [ showModal2, setShowModal2 ] = useState(false);  
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ showNotif2, setShowNotif2 ] = useState(false); 
  const [ showNotif3, setShowNotif3 ] = useState(false); 
  const [ showNotif4, setShowNotif4 ] = useState(false); 
  const [ deleteTopic, setDeleteTopic ] = useState(false); 
  const [ addQuestion, setAddQuestion ] = useState(false); 
  const [ allStudents, setAllStudents ] = useState(null); 
  const [ addStudent, setAddStudent ] = useState(null); 
  const [ showOptions, setShowOptions ] = useState({
    id: null,
    show: null,
  });  
  const { currentUser: user, loading: authLoading} = useAuth()
  const tutorId = user?.uid
 

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setError(null); 
        const colRef = collection(db, `admin/${tutorId}/topics`);
        const docRef = doc(db, "admin", tutorId)
        const allPromises = await Promise.all([getDocs(colRef), getDoc(docRef)])
        const allTopics = allPromises[0].docs; 
        const tutorDocument = allPromises[1].data(); 
        const updatedStudents = tutorDocument.students.map((stud) => {
          const newStudentObj = {
            ...stud, 
            included: false
          }
          return newStudentObj; 
        })
        setAllTopics(allTopics); 
        setAllStudents(updatedStudents); 
      } catch(e) {
          setError(
            !navigator.onLine
              ? "You're currently offline. Please reconnect to the internet and try again."
              : errorMessages[e.code] ?? "Something went wrong. Please try again."
          );
      } finally {
          setLoading(false); 
      }
    }

    fetchTopics(); 
        
  }, [deleteTopic, addQuestion, addStudent])


  if(authLoading) {
    return (
      <div className="loader-container">
      <RevolvingDot 
        visible={true}
        height="80"
        width="80"
        color="orange"
      />
      </div>
    )
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
    return <p className="center_piece">{error}</p>
  }

  const randomClick = () => {
    setShowOptions({
      id: null, 
      show: showOptions.show, 
    })
  }  

  const handleShowOptions = (topicName) => {
    setShowOptions({
      id: topicName, 
      show: showOptions.id === topicName || showOptions.show === null ? !showOptions.show : showOptions.show

    })
  }  

  const handleViewStudents = (topicData) => {
    navigate("/navtut/topicmembers", { state: topicData})
  }

  const handleDeleteTopic = (topicData) => {
    
    const topicDataSerial = JSON.stringify(topicData); 
    localStorage.setItem('topicConfig', topicDataSerial)
    setDeleteTopic(true); 
  }

  const handleAddQuestion = (topicData) => {
    const topicDataSerial = JSON.stringify(topicData); 
    localStorage.setItem('topicConfig', topicDataSerial)
    setAddQuestion(true); 
  }



 const handleAddStudent = (topicData) => {
  let newTopicConfig ; 
  const ids = topicData.students.map((currStudent) => currStudent.studentId)

  const notIncluded = allStudents.filter((student) => !ids.includes(student.studentId))
  if (notIncluded.length === 0) {
    setShowNotif2(true); 
  } else {
      newTopicConfig = {
        ...topicData, 
        students: notIncluded,
      }
      const topicConfigSerial = JSON.stringify(newTopicConfig); 
      localStorage.setItem('topicConfig', topicConfigSerial); 
      setAddStudent(true);     
    }
 }



  const handleShowModal2 = (topicName) => {
    setTopicName(topicName); 
    setShowModal2(true); 
  }   

  const handleChange = (e) => {
    setNewName(e.target.value); 
  }

  const manageNameChange = async () => {
    setChanging(true); 
    try {
      const docRef = doc(db, "admin", tutorId); 
      const newChangedTopics = {
        ...changedTopics, 
        [topicName]: newName, 
      }
      await updateDoc(docRef, {changedTopics: newChangedTopics})    
      dispatch(changeTopic( newChangedTopics ))      
      setShowModal2(false); 
      setShowNotif4(true);         
    } catch (e) {
      console.log(e)
      setNameChangeErr(
        !navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[e.code] ?? "Something went wrong. Please try again."
      )
    } finally {
      setChanging(false); 
    }
  }



  return(
    <div className="center_piece" onClick={randomClick}>
      <h2 className="centered">Topics</h2>
      {showNotif && <Notif operation='delete' setShowNotif={setShowNotif}/> }
      {showNotif2 && <Notif operation='no-students' setShowNotif={setShowNotif2}/> }
      {showNotif3 && <Notif operation='add-student' setShowNotif={setShowNotif3} />}
      {showNotif4 && <Notif operation='change-topic' setShowNotif={setShowNotif4}/>}
      {allTopics.length === 0 ? 
        <p className="centered">No topics yet.</p>
      
      
      : allTopics.map((topic)=>
      <div key={topic.id} className="listItem relative">
        <div>{parseCode(parseTopic(topic.data().topicName, changedTopics))}</div>
        <div className="three-dots for-mobile"
          onClick={(e) => {
            e.stopPropagation(); 
            handleShowOptions(topic.id)
          }}
        >⋮</div>
        <div className={showOptions.id === topic.id && showOptions.show ? 'action-group' : 'buttonPair'}>

          <div className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} onClick={() => handleViewStudents(topic.data())}>students</div>
          
          <div 
            className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
            onClick={() => handleAddQuestion(topic.data())}>
              + question
            </div>
            <div 
              className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
              onClick={() => handleAddStudent(topic.data())}>
                + student
            </div>
          <div className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
          onClick={() => handleShowModal2(topic.id)}>Rename</div>            
            <div className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} style={{color: 'red'}} onClick={() => handleDeleteTopic(topic.data()) }>delete</div>
        </div>
      </div> 
      )}
      {deleteTopic && 
        <TopicConfig  setShowModal={setDeleteTopic} setShowNotif={setShowNotif} deleteTopic={true} /> 
      }
      {addQuestion && 
        <TopicConfig  setShowModal={setAddQuestion} setShowNotif={setShowNotif} addQuestion={true} />
      }

      { addStudent && 
          <TopicConfig  setShowModal={setAddStudent} setShowNotif={setShowNotif3} addStudent={true} />
      }


      { showModal2 && 
      <div className="modal">
        <div className="modal-content">
          <div onClick={() => setShowModal2(false)} className="close-modal">&times;</div>
          <h4 className="header-centered">Rename Topic</h4>
          <div className="flex-vert">
          <input 
            className="textInput"
            value={newName}
            onChange={handleChange}
          /> 
          <button 
            disabled={changing}
            onClick={manageNameChange} className="button centered">{changing ? 'changing...' : 'Confirm'}</button>
            {nameChangeErr && <p className="error-message">{nameChangeErr}</p>}
            </div>
        </div>
      </div>}      
    </div>

  )
}

const parseCode = (text) => {
  if (!text) return text;

  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3);

      return (
        <pre key={index}>
          <code>{code}</code>
        </pre>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      const code = part.slice(1, -1);

      return (
        <code key={index}>{code}</code>
      );
    }

    return part;
  });
};