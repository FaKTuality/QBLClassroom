import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../Firebase/index.js";
import { useState, useEffect } from "react";
import { RevolvingDot } from "react-loader-spinner";
import { useThreeDots } from "../Hooks";
import { Notif } from "./Notif";
import { arrayRemove } from "firebase/firestore";
import { useDispatch } from "react-redux";
import { changeName } from "../store/topicConfigSlice";
import { useNameChange, parseName } from "../Hooks";


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



export const Students = () => {
  const [ newName, setNewName ] = useState(''); 
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ showNotif2, setShowNotif2 ] = useState(false); 
  const [ showModal, setShowModal ] = useState(false); 
  const [ showModal2, setShowModal2 ] = useState(false); 
  const [ students, setStudents ] = useState(null); 
  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [ nameChangeErr, setNameChangeErr ] = useState(null); 
  const [ removing, setRemoving ] = useState(false)
  const [ studentObj, setStudentObj ] = useState('')
  const [ changing, setChanging ] = useState(false); 
  const { showOptions, setShowOptions, handleShowOptions, randomClick } = useThreeDots(); 
  const changedNames = useNameChange()
  const dispatch = useDispatch(); 


  useEffect(() => {
    const fetchStudents = async () => {
      try{
        const docRef = doc(db, "admin", auth?.currentUser?.uid)
        const docSnap = await getDoc(docRef); 
        const { students } = docSnap.data()
        setStudents(students);         
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

    fetchStudents(); 
  }, [showNotif])



  if (loading) {
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

  const handleRemove = async () => {
    setError(null); 
    setRemoving(true); 
    try {
      await updateDoc(doc(db, "admin", auth?.currentUser?.uid), { students: arrayRemove(studentObj)})
      setShowNotif(true); 
      setShowModal(false); 
    } catch(e) {
      setError(e.message); 
    } finally {
      setRemoving(false); 
    }
    
  }

  const handleShowModal = (studentObj) => {
    setStudentObj(studentObj); 
    setShowModal(true); 
  }

  const handleShowModal2 = (studentObj) => {
    setStudentObj(studentObj); 
    setShowModal2(true); 
  }  


  const handleChange = (e) => {
    setNewName(e.target.value); 
  }

  const manageNameChange = async () => {
    setChanging(true); 
    try {
      const docRef = doc(db, "admin", auth.currentUser.uid); 
      const newChangedNames = {
        ...changedNames, 
        [studentObj.studentId]: newName, 
      }
      await updateDoc(docRef, {changedNames: newChangedNames})    
      dispatch(changeName( newChangedNames ))      
      setShowModal2(false); 
      setShowNotif2(true);         
    } catch (e) {
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
    <div className="center_piece">
    <h3 className="centered">Manage all your students</h3>
      
        {students.length === 0 ? 
        <p className="centered">You have no students yet.</p>
      :students?.map((student, studentIndex) => 
        <div key={student.studentId} className="listItem relative" onClick={randomClick}>
        <div className="three-dots for-mobile"
          onClick={(e) => {
            e.stopPropagation(); 
            handleShowOptions(student.studentId)
          }}
        >⋮</div>          
          <div>{parseName(student.studentName, student.studentId, changedNames)}</div>
          <div 
            className={showOptions.id === student.studentId && showOptions.show ? 'action-group' : 'buttonPair'}>
              <button 
                  disabled={student.studentName === "Alex Doe"}
                  onClick={() => handleShowModal({ studentId: student.studentId, studentName: student.studentName })}
                  className={`${showOptions.id === student.studentId && showOptions.show ? 'action' : 'button'}`} 
                  >remove</button>    
              <button 
                onClick={() => handleShowModal2({ studentId: student.studentId, studentName: student.studentName })}
                  className=
                  {`${showOptions.id === student.studentId && showOptions.show ? 'action' : 'button'}`} 
                >Rename</button> 
          </div>
          {showNotif && <Notif operation="remove-student" setShowNotif={setShowNotif} studentName={student.studentName} />}
          {showNotif2 && <Notif operation="change-name" setShowNotif={setShowNotif2} studentName={student.studentName} />}
          </div>


        )}
        { showModal && 
        <div className="modal">
          <div className="modal-content">
            <div onClick={() => setShowModal(false)} className="close-modal">&times;</div>
            <p className="centered">{`Are you sure you want to remove ${studentObj.studentName}?`}</p>
            <button 
              disabled={removing}
              onClick={handleRemove} className="button centered">{removing ? 'removing...' : 'Confirm'}</button>
          </div>
        </div>}
    
        { showModal2 && 
        <div className="modal">
          <div className="modal-content">
            <div onClick={() => setShowModal2(false)} className="close-modal">&times;</div>
            <h4 className="header-centered">Rename {studentObj.studentName}</h4>
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