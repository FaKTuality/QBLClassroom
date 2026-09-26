import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { useState, useEffect, useContext } from "react";
import { db } from "../../Firebase/index.js";
import { useNavigate } from "react-router-dom";
import { AuthContext, useAuth } from "../store/authProvider";
import { TopicConfig } from "./TopicConfig";
import { Notif } from "./Notif";
import { RevolvingDot } from "react-loader-spinner";
import { useTopicChange } from "../Hooks";
import { useDispatch } from "react-redux";
import { changeTopic } from "../store/topicConfigSlice";
import GoogleAds from "./AdComponent.jsx";
import { useSelector } from "react-redux";
import { errorMessages, parseTopic, parseCode, } from "../Helpers/index.jsx";







export const ViewTopics = () => {
  
  const navigate = useNavigate();
  const dispatch = useDispatch(); 
  const changedTopics = useTopicChange(); 
  const [ newName, setNewName ] = useState(''); 
  const [ topicName, setTopicName ] = useState(null);
  const [ changing, setChanging ] = useState(false); 
  const [ deleting, setDeleting ] = useState(false); 
  const [ deletingErr, setDeletingErr ] = useState(false); 
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
 const [ tutorView, setView ] = useState(false); 
 const [ showModal3, setShowModal3 ] = useState(false); 

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
        
  }, [deleteTopic, addQuestion, addStudent, showModal3])


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


  const handleTutorView = () => {
    setView(!tutorView); 
  }

  const handleAddQuestionTV = (topicData) => {
    const questionState = {
      topicName: topicData.topicName, 
      isEditing: false,
    }
    navigate('/navtut/questionformTV', { state: questionState})
  }


    const deleteAllQuestionsStudent = async(student) => {
      const colRef = collection(db, `users/${student.studentId}/topics/${topicName}/questions`)
      const querySnap = await getDocs(colRef); 
      const allProm = querySnap.docs.map((docSnap) => {
        const ref = doc(db, `users/${student.studentId}/topics/${topicName}/questions/${docSnap.id}`)
        const ref2 = doc(db, `users/${student.studentId}/topics/${topicName}/submissions/${docSnap.id}`)
        return Promise.all([deleteDoc(ref), deleteDoc(ref2)]); 
      })
      await Promise.all(allProm);       
    }

    const deleteTopicStudent = async (student) => {
      const docRef = doc(db, `users/${student.studentId}/topics/${topicName}`);
      return Promise.all([deleteDoc(docRef), deleteAllQuestionsStudent(student)])
    }    


  const handleDeleteTopicTV = async () => {
    setDeletingErr(false); 
    try {
      setDeleting(true); 
      const docRef = doc(db, "admin", tutorId, "topics", topicName); 
      const colRef = collection(db, "admin", tutorId, "topics", topicName, "questions")
      const querySnap = await getDocs(colRef); 
      const allProm = querySnap.docs.map((docSnap) => {
        const docRef1 = doc(colRef, docSnap.id);
        return deleteDoc(docRef1); 
      })
      await Promise.all(allProm)
      const docRef2 = doc(db, 'admin', tutorId); 
      const docSnap = await getDoc(docRef2); 
      const { students } = docSnap.data(); 
      const studentPromises = students.map((student) => deleteTopicStudent(student))
      await Promise.all(studentPromises)
      await deleteDoc(docRef); 
      setShowModal3(false);
      setShowNotif(true); 
    } catch(e) {
      console.error(e); 
      setDeletingErr(
        !navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[e.code] ?? "Something went wrong. Please try again."        
      )
    } finally {
      setDeleting(false); 
    }
  }

  const confirmDelete = (topicData) => {
    setTopicName(topicData.topicName); 
    setShowModal3(true); 
  }

  const handleViewQuestions = (topicData) => {
    const newState = {
      ...topicData, 
      tutorView, 
    }
    navigate('/navtut/topicquestions', { state: newState })
  }


  return(
    <div className="center_piece" onClick={randomClick}>
      <h2 className="centered">Topics</h2>
          <div className="theme-slider centered">
            <span className="theme-slider-label">Student View</span>
            <div className="theme-slider-track">
              <div className={`${tutorView ? 'turnedOn' : 'turnedOff'}`} onClick={handleTutorView}></div>
            </div>
            <span className="theme-slider-label">Tutor View</span>
        </div>       
      
      {showNotif && <Notif operation='delete' setShowNotif={setShowNotif}/> }
      {showNotif2 && <Notif operation='no-students' setShowNotif={setShowNotif2}/> }
      {showNotif3 && <Notif operation='add-student' setShowNotif={setShowNotif3} />}
      {showNotif4 && <Notif operation='change-topic' setShowNotif={setShowNotif4}/>}
      {allTopics.length === 0 ? 
        <p className="centered">No topics yet.</p>
      
      
      : allTopics.map((topic)=>
      <div key={topic.id} className="listItem relative">
        <div style={{cursor: "pointer"}} onClick={tutorView ? () => handleViewQuestions(topic.data())
           : () => handleViewStudents(topic.data())}>{parseCode(parseTopic(topic.data().topicName, changedTopics))}</div>
        <div className="three-dots for-mobile"
          onClick={(e) => {
            e.stopPropagation(); 
            handleShowOptions(topic.id)
          }}
        >⋮</div>
        <div className={showOptions.id === topic.id && showOptions.show ? 'action-group' : 'buttonPair'}>

          {!tutorView && <div className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} onClick={() => handleViewStudents(topic.data())}>students</div>}
          
          <div 
            className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
            onClick={tutorView ? () => handleAddQuestionTV(topic.data()) : () => handleAddQuestion(topic.data())}>
              + question
            </div>
           {tutorView && <div 
              className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
              onClick={() => handleAddStudent(topic.data())}>
                + student
            </div>}

           {tutorView && <div 
              className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
              onClick={() => handleViewQuestions(topic.data())}>
                View Questions 
            </div>}            
          {tutorView && <div className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} 
          onClick={() => handleShowModal2(topic.id)}>Rename</div>}            
            <div className={`${showOptions.id === topic.id && showOptions.show ? 'action' : 'button'}`} style={{color: 'red'}} 
            onClick={tutorView ? () => confirmDelete(topic.data()) : () => handleDeleteTopic(topic.data()) }>delete</div>
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




      { showModal3 && 
      <div className="modal">
        <div className="modal-content">
          <div onClick={() => setShowModal3(false)} className="close-modal">&times;</div>
          <h4 className="header-centered">Confirm Delete</h4>
          <p>Are you sure you want to delete this topic?</p>
          <button 
            disabled={deleting}
            onClick={handleDeleteTopicTV} className="button centered">{deleting ? 'deleting...' : 'Confirm'}</button>
            {deletingErr && <p className="error-message centered">{deletingErr}</p>}
            
        </div>
      </div>}      

    </div>

  )
}

