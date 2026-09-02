import { getDocs, collection, doc, deleteDoc, getDoc, updateDoc, setDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { Formik, Field, ErrorMessage, Form } from "formik";
import { useState, useEffect, useContext } from "react";
import * as Yup from 'yup';
import { useDispatch, useSelector } from "react-redux";
import { db } from "../../Firebase/index.js";
import { useNavigate, useLocation } from "react-router-dom";
import { configureTopic } from "../store/topicConfigSlice";
import { createPortal } from "react-dom";
import { AuthContext, useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";
import { useNameChange, parseName, useTopicChange, parseTopic, parseCode } from "../Hooks";
 

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

// you can have tutordashboard fetch students and simply pass them to topic config, eliminating the need to 
// fetch data at all. 


export const TopicConfig = ({ setShowModal, setShowNotif, deleteTopic, addQuestion, addStudent, editing, deletingQuestion }) => {
  const changedNames = useNameChange(); 


  
  const defaultTopicConfig = JSON.parse(localStorage.getItem('topicConfig'))
  const questionInfo = JSON.parse(localStorage.getItem('questionInfo'));
  const { students, topicName } = defaultTopicConfig || {};
  const { questionNumber } = questionInfo || {};
  const topicSlice = useSelector((state) => state.topicConfig)
  const dispatch = useDispatch(); 
  const navigate = useNavigate();    
  const [ loading, setLoading ] = useState(!defaultTopicConfig ? true : false); 
  const [ initialValues, setInitialValues ] = useState({
    topicName: defaultTopicConfig?.topicName || '', 
    students: deletingQuestion ? defaultTopicConfig?.students
      .filter((student) => !(`${topicName}${questionNumber}deleted` in student)) : defaultTopicConfig?.students  || [],
  })
  
  const [ error, setError ] = useState(null); 
  const [ deleting, setDeleting ] = useState(false); 
  const [ addingStudent, setAddingStudent ] = useState(false); 
  const { currentUser: user, loading: authLoading} = useAuth()
  const tutorId = user?.uid
  




  const validationSchema = Yup.object(
    {
      topicName: Yup.string().required('please enter a topic'), 
      students: Yup.array().of(Yup.object({
        studentId: Yup.string(), 
        studentName: Yup.string(), 
        included: Yup.boolean().required()
      })).test("one-selected", "please select at least one student", (students) => students?.some((student)=> student.included))

    }
  )


  useEffect(() => {
    if(!tutorId) return; 
    if (!defaultTopicConfig) {
        const fetchUsers = async () => {
        const students = []; 
        try{
            const docRef = doc(db, `admin/${tutorId}`)
            const docSnap = await getDoc(docRef);
            docSnap.data().students.forEach((stud, index)=> {
              const student = {
                studentId: stud.studentId, 
                studentName: stud.studentName, 
                included: false
              }
              students.push(student); 
            })
            setInitialValues({
              topicName: '', 
              students
            }); 
            
            setError(null); 
          } catch(e) {
            setError(
              !navigator.onLine
                ? "You're currently offline. Please reconnect to the internet and try again."
                : errorMessages[e.code] ?? "Something went wrong. Please try again."
            );
          }finally {
            setLoading(false); 
          }
      }

      fetchUsers(); 
    }
  },[tutorId])


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
      <div className="modal">
      <div className="modal-content loader-container">
      <RevolvingDot 
        visible={true}
        height="80"
        width="80"
        color="orange"

      />
      </div>
      </div>)
  }



  const onSubmit = async (values) => {
    if(!defaultTopicConfig){
      console.log("I dispatch configureTopic")
      await dispatch(configureTopic({tutorId, topicConfig: values}))
    } else {
        const selectedStudents = values.students.filter((student) => student.included)
        const topicConfigSerial = JSON.stringify({ 
          topicName: values.topicName, 
          students: selectedStudents, 
          name: defaultTopicConfig.name, 
          studentId: defaultTopicConfig.studentId,
          isEditing: editing ? true: false,
        })

        localStorage.setItem("topicConfig", topicConfigSerial);
    }
    
    navigate('/navtut/questionform')
  }

  const handleDelete = async (values) => {
    const selectedStudents = values.students.filter((student) => student.included)
    const allStudents = values.students.every((student) => student.included)    
    const deleteQuestion = async (student) => {
      const docRef = doc(db, `users/${student.studentId}/topics/${values.topicName}/questions/${questionNumber}`); 
      const docRef2 = doc(db, `admin/${tutorId}/topics/${values.topicName}`)
      const allPromises = Promise.all([deleteDoc(docRef), getDoc(docRef2)])
      const result = await allPromises;
      const { students } = result[1].data();
      const updatedStudents = students.map((student)=>{
        for(let stud of selectedStudents){
          if(stud.studentId === student.studentId){
            student[`${values.topicName}${questionNumber}deleted`] = questionNumber
          } 
          return student;
        }
      })
      await updateDoc(docRef2, { students: updatedStudents})
    };
    try{
      setError(null); 
      setDeleting(true); 
      const studentPromises = selectedStudents.map((student) => deleteQuestion(student))
      await Promise.all(studentPromises); 
      localStorage.removeItem("topicConfig");
      localStorage.removeItem("questionInfo")
      setShowNotif(true); 
      setShowModal(false); 
      
    } catch(e) {
      setError(
        !navigator.onLine
          ? "You're currently offline. Please reconnect to the internet and try again."
          : errorMessages[e.code] ?? "Something went wrong. Please try again."
      );
    } finally {
      setDeleting(false); 
    }
  }

  const handleDeleteTopic = async (values) => {
    const selectedStudents = values.students.filter((student) => student.included)
    const allStudents = values.students.every((student) => student.included)

    const deleteAllQuestionsTutor = async () => {
      const colRef = collection(db, `admin/${tutorId}/topics/${values.topicName}/questions`)
      const querySnap = await getDocs(colRef); 
      const allProm = querySnap.docs.map((docSnap) => {
        const ref = doc(db, `admin/${tutorId}/topics/${values.topicName}/questions/${docSnap.id}`)
        return deleteDoc(ref); 
      })
      await Promise.all(allProm); 
    }

    const deleteAllQuestionsStudent = async(student) => {
      const colRef = collection(db, `users/${student.studentId}/topics/${values.topicName}/questions`)
      const querySnap = await getDocs(colRef); 
      const allProm = querySnap.docs.map((docSnap) => {
        const ref = doc(db, `users/${student.studentId}/topics/${values.topicName}/questions/${docSnap.id}`)
        return deleteDoc(ref); 
      })
      await Promise.all(allProm);       
    }

    const deleteTopicForTutor = async () => {
      const docRef = doc(db, `admin/${tutorId}/topics/${values.topicName}`)
      const docRef2 = doc(db, "admin", tutorId, "LQN", values.topicName)
      await Promise.all([deleteAllQuestionsTutor(), deleteDoc(docRef), deleteDoc(docRef2)]); 
    }

    const deleteTopic = async (student) => {
      const docRef = doc(db, `users/${student.studentId}/topics/${values.topicName}`);
      const docRef2 = doc(db, "admin", tutorId, "topics", values.topicName)
      return Promise.all([deleteDoc(docRef), deleteAllQuestionsStudent(student), updateDoc(docRef2, { students: arrayRemove(student) })])
    }
    try {
      setError(null); 
      setDeleting(true); 
      const studentPromises = selectedStudents.map((student) => deleteTopic(student))
      await Promise.all(studentPromises)
      localStorage.removeItem("topicConfig")
      if(allStudents){
        await deleteTopicForTutor(); 
      }
      setShowNotif(true); 
      setShowModal(false); 
    } catch(e) {
      setError(
        !navigator.onLine
          ? "You're currently offline. Please reconnect to the internet and try again."
          : errorMessages[e.code] ?? "Something went wrong. Please try again."
      );
    } finally {
      setDeleting(false); 
    }
    
    
  }
  
  const closeModal = () => {
    setShowModal(false); 
      localStorage.removeItem("topicConfig");
      localStorage.removeItem("questionInfo"); 
  
  }


  const handleAddStudent = async (values) => {
  
    let allPromises; 
    const selectedStudents = values.students.filter((student) => student.included);
    
    const saveQuestion = async(student, docSnap)=> {
      const docRef = doc(db, `users/${student.studentId}/topics/${values.topicName}/questions/${docSnap.id}`)
      const docRef2 = doc(db, `users/${student.studentId}/topics/${values.topicName}`);      
      return Promise.all([ setDoc(docRef, docSnap.data()), setDoc(docRef2, { createdAt: serverTimestamp()}) ])      
    }

    const addStud = (student) => {
      const docRef = doc(db, `admin/${tutorId}/topics/${values.topicName}`); 
      return updateDoc(docRef, { students: arrayUnion({ studentName: student.studentName, studentId: student.studentId, included: student.included})})
    }    

    const querySnap = await getDocs(collection(db, `admin/${tutorId}/topics/${values.topicName}/questions`));
    const docSnapArr = querySnap.docs;
    setAddingStudent(true); 
    try {
      
      for(let docSnap of docSnapArr) {
        allPromises = selectedStudents.map((student) => saveQuestion(student, docSnap))
        await Promise.all(allPromises); 
        
      } 
        const allPromises2 = selectedStudents.map((student)=> addStud(student))
        await Promise.all(allPromises2)
        setShowModal(false); 
        setShowNotif(true);       
    } catch(e) {
         
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );
              } finally {
        setAddingStudent(false); 
      }
  }





  return createPortal(
    <div className="modal">
    
    <Formik
    
      initialValues={initialValues}
      validateOnChange
      validationSchema={validationSchema}
      onSubmit={deleteTopic ? handleDeleteTopic : deletingQuestion ? handleDelete : addStudent ? handleAddStudent : onSubmit}
    >
        {({ values }) => 
          <Form className="modal-content list relative">
            {!deleteTopic && !editing && !addQuestion && !deletingQuestion && !addStudent &&<h4 className="header-centered">Configure your action</h4>}
            <div onClick={closeModal} className="close-modal">×</div>
            {!(addQuestion || editing || deleteTopic || addStudent || deletingQuestion) &&
            <div className="label-input-pair-vertical">
              <label htmlFor="topicName">Topic:</label>
              <Field 
                className="textInput"
                name="topicName" 
                id="topicName" 
                disabled={defaultTopicConfig || deleteTopic }/>
            </div>}
            <ErrorMessage 
              name="topicName" 
              component="div"
              className="error-message"
              />
              {deleteTopic && <h5 className="centered">Select students to delete this topic for</h5>}
              {editing  && <h5 className="centered">Select students to edit this question for</h5>}
              {addQuestion && <h5 className="centered">Select students to add questions for</h5>}
              { deletingQuestion && <h5 className="centered">{`Select students to delete this question for`}</h5>}
              { addStudent && <h5 className="centered">{`Select students to add to this topic`}</h5>}
              {!deleteTopic && !editing && !addQuestion && !deletingQuestion && !addStudent && <h5 className="centered">Select students to add to this topic </h5>}

            <div className="topicConfigList">
              {values.students?.map((student, index)=> 
                  <div key={student.studentId} className="label-input-pair">
                    
                    <Field 
                      id={student.studentId}
                      type='checkbox'
                      name={`students.${index}.included`}
                      className="checkbox"
                      // you could add a checked attribute if included is true
                    />
                    <label htmlFor={student.studentId}>{parseName(student.studentName, student.studentId, changedNames)}</label>
                  </div>
              )}

              <ErrorMessage 
                name="students" 
                component="div"
                className="error-message"
                />
            </div>
            { deleteTopic && 
              <button className="button button-centered" type="submit" disabled={deleting}>{deleting ? 'deleting topic...' : 'delete topic' }</button>  
            }
            { (editing || addQuestion) && 
              <button className="button button-centered" type="submit" disabled={topicSlice.savingConfiguration}>
                {topicSlice.savingConfiguration ? "Saving Configuration..." :"Save Configuration"}
              </button>              
            }
          
            { deletingQuestion &&
              <button className="button button-centered" type="submit" disabled={deleting}>{deleting ? 'deleting question...' : 'delete question'}</button>
            }
            { addStudent && 

              <button className="button button-centered" type="submit" disabled={addingStudent}>{addingStudent ? 'adding student...' : 'add student'}</button>

            }
            {!deleteTopic && !editing && !addQuestion && !deletingQuestion && !addStudent && 
              <button className="button button-centered" type="submit" disabled={topicSlice.savingConfiguration}>
                {topicSlice.savingConfiguration ? "Saving Configuration..." :"Save Configuration"}
              </button>                                
            }
   
            {topicSlice.error && <div>{topicSlice.error}</div>}
          </Form>
        }
      </Formik>   
    </div>, document.getElementById('modal-root'))
}