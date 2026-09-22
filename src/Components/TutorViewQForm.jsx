
import { Form, Formik } from "formik";
import { Field } from "formik";
import * as Yup from 'yup'; 
import { useSelector } from "react-redux";
import { FieldArray } from "formik";
import { ErrorMessage } from "formik";
import { setDoc, doc, getDocs, collection, serverTimestamp, updateDoc, increment, getDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";
import { Notif } from "./Notif";
import { useNavigate, useLocation } from "react-router-dom";
import { useTopicChange, useNameChange, parseTopic, parseCode, parseName } from "../Hooks";
import { useFormikContext } from "formik";
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


const DraftAutosave = () => {
  const { values } = useFormikContext();
 
  useEffect(() => {
    localStorage.setItem('questionDraft', JSON.stringify(values));
  }, [values]);
 
  return null;
};



export const QuestionFormTV = () => {
  const { currentUser: user, loading: authLoading} = useAuth()
  const location = useLocation();
  const [ questionState ] = useState(location.state); 
  const { topicName, questionData, questionNumber, isEditing } = questionState; 
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ showNotif2, setShowNotif2 ] = useState(false); 
  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [ bookmark, setBookmark ] = useState(null)
  const tutorId = user?.uid
  const navigate = useNavigate(); 
  const changedTopics = useTopicChange(); 
  const changedNames = useNameChange(); 

  

useEffect(() => {
  return () => {
    if (!questionData) {
      localStorage.removeItem('questionDraft');
    }
    localStorage.removeItem('topicConfig'); 
    localStorage.removeItem('questionInfo'); 
  };
}, []);
  
  useEffect(() => {
    const getLQN = async () => {
      try {
        const docSnap = await getDoc(doc(db, "admin", tutorId, "LQN", topicName))
        docSnap.exists() ? setBookmark(docSnap.data().last) : setBookmark(1);  
        setLoading(false);
      } catch(e) {
        console.error(e)
        setError(!navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[e.code] ?? "Something went wrong. Please try again.")
      } finally {
        setLoading(false);
      }
    }

    if(isEditing) {
      setLoading(false)
    } else {
      getLQN(); 
    }    
  }, [showNotif])


  if(authLoading || loading) {
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

  if(error) {
    return(<p className="centered" style={{color: 'red'}}>{!navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[error.code] ?? "Something went wrong. Please try again."}</p>
    )
  }
    

  
  const handleSubmit = async (values, { resetForm, setStatus, setSubmitting }) => {
    if (!navigator.onLine) {
        setStatus("You're currently offline. Please reconnect to the internet and try again.");
        setSubmitting(false);
        return;
    }         
    setStatus(null); 
    try{    
    const newValues = !values.additionalMediaType && values.additionalMediaLink ? {...values, additionalMediaLink: ''}: values;

    const saveQuestion = async (questionNumber) => { 
      let docRef; 
      if(isEditing){
        docRef = doc(db, `admin/${tutorId}/topics/${topicName}/questions/${questionNumber}`)
      } else {
        docRef = doc(db, `admin/${tutorId}/topics/${topicName}/questions/question${String(bookmark).padStart(4, "0")}`)
      } 
      return setDoc(docRef, newValues)
    }
    
      await saveQuestion(questionNumber)
      isEditing ? resetForm({ values: {
          additionalMediaType: "",
          additionalMediaLink: "",
          questionText: "",
          options: [
          {
            text: "",
            responseType: "",
            responsePayload: ""
          }
          ]
        }}) : resetForm();
        
      if(isEditing) { 
          setShowNotif2(true);     
          setTimeout(() => {
            navigate('/navtut/topicquestions', { state: { topicName, tutorView: true } })
          }, 1000)  
      } else {
        if(bookmark === 1){
          await setDoc(doc(db, "admin", tutorId, "LQN", topicName), { last: 2})
        } else {
          await updateDoc(doc(db, "admin", tutorId, "LQN", topicName), { last: increment(1)})
        }
        
        setShowNotif(true);        
        setLoading(true); 
      }        
    } catch(e){
      
      setStatus(!navigator.onLine
      ? "You're currently offline. Please reconnect to the internet and try again."
      : errorMessages[e.code] ?? "Something went wrong. Please try again.")
    } finally {
      console.log("goes into finally too")
      setSubmitting(false); 
    }
  }

  const validationSchema = Yup.object().shape({
      additionalMediaType: Yup.string(), 
      additionalMediaLink: Yup.string().when("additionalMediaType", {
        is: (additionalMediaType) => !!additionalMediaType, 
        then: (schema) => schema.required('Please provide a link to the additional media'), 
        otherwise: (schema) => schema.notRequired() 
      }),
      questionText: Yup.string().required('please enter a question'), 
      options: Yup.array().of(Yup.object({
        text: Yup.string().required('please enter a response'), 
        responseType: Yup.string().required('please choose a response type'), 
        responsePayload: Yup.string().required('please enter a response text or link'), 
      }
      )).min(2, "A question must have at least two options")
    }
  )

const draftValues = !questionData
  ? JSON.parse(localStorage.getItem('questionDraft') || 'null')
  : null;
 
let initialValues = questionData || {
  additionalMediaType: draftValues?.additionalMediaType || "",
  additionalMediaLink: draftValues?.additionalMediaLink || "",
  questionText: draftValues?.questionText || "",
  options: draftValues?.options || [
    {
      text: "",
      responseType: "",
      responsePayload: ""
    }
  ]
};
const optionCreator = () => ({
      text: "",
      responseType: "",
      responsePayload: ""
    })

const handleRemove = (remove, optionIndex) => {
  remove(optionIndex); 
}

const handleAdd = (setFieldValue, fieldPath, values) => {

  setFieldValue(fieldPath, [...values.options, optionCreator()] )
}

  return (
    <div className="center_piece">
      {showNotif && <Notif operation="add-question" setShowNotif={setShowNotif} questionNumber={bookmark-1} />}
      {showNotif2 && <Notif operation="edit-question" setShowNotif={setShowNotif2} questionNumber={questionNumber} />}

      {
      <div>
        <div className="q-number">{questionNumber ? `question ${parseInt(questionNumber?.slice(8), 10)}` : `question ${bookmark}`}</div>
        <h2 className="header-centered">{parseCode(parseTopic(topicName, changedTopics))}</h2>
        {isEditing && <h3 className="header-centered">
          Editing Question Bank</h3>}
      </div>
      }
  

    <Formik
    
    initialValues={initialValues}
    validationSchema={validationSchema}
    validateOnChange
    onSubmit={handleSubmit}>
      {({ values, setFieldValue, isSubmitting, status, errors }) => 
        <Form className="q-form">
          {!questionData && <DraftAutosave />}
          <div className="label-input-pair-vertical">
          <label htmlFor="additionalMediaType">additional question media</label>
          <Field 
            name="additionalMediaType"
            as="select"
            id="additionalMediaType"
            className="select">
              <option value="">None</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="image">Image</option>
          </Field>
          </div> 
          <ErrorMessage 
            name="additionalMediaType" 
            component="div"
            className="error-message"/>
         
          { values.additionalMediaType &&
          <>
            <div className="label-input-pair-vertical">
              <label htmlFor="additionalMediaLink">paste an external link to your media</label>
              <Field 
                name="additionalMediaLink" 
                id="additionalMediaLink" 
                className="textInput" /> 
            </div>
              
              <ErrorMessage 
                name="additionalMediaLink" 
                component="div"
                className="error-message"/>

            </>

          }
          <div className="label-input-pair-vertical q-container">
            <label htmlFor="questionText">Enter your question</label>
            <Field 
              name="questionText"
              id="questionText"
              component="textarea"
              className="q-text-area"
            />


            <ErrorMessage 
              name="questionText" 
              className="error-message"
              component="div"
              />

          </div>     
          <div >
            <FieldArray name="options">
              {({remove}) => 
                <>
                  { values.options.map((option, optionIndex) => 
                    <div key={optionIndex} className="option-group">
                      <div className="label-input-pair-vertical">
                        <label htmlFor={`options.${optionIndex}.text`}>Enter an option</label>
                        <Field
                          name={`options.${optionIndex}.text`}
                          id={`options.${optionIndex}.text`}
                          className="textInput"
                        />



                      <ErrorMessage 
                        name={`options.${optionIndex}.text`} 
                        component="div"
                        className="error-message" />    

                      </div>

                      <div className="label-input-pair-vertical">
                        <label htmlFor={`options.${optionIndex}.responseType`}>Response type</label>
                        <Field
                          name={`options.${optionIndex}.responseType`}
                          as="select"
                          id={`options.${optionIndex}.responseType`}
                          className="select"
                        >
                          <option value="" selected disabled>none</option>
                          <option value="video">Video</option>
                          <option value="audio">Audio</option>
                          <option value="image">Image</option>
                          <option value="text">Text</option>
                        </Field>

                        
                        <ErrorMessage 
                          name={`options.${optionIndex}.responseType`} 
                          className="error-message" 
                          component="div"
                          />
                      </div>

                      <div className="label-input-pair-vertical">
                        <label htmlFor={`options.${optionIndex}.responsePayload`}>Enter response</label>
                        <Field
                          name={`options.${optionIndex}.responsePayload`}
                          id={`options.${optionIndex}.responsePayload`}
                          className="textInput"
                        />

                        <ErrorMessage 
                          name={`options.${optionIndex}.responsePayload`} 
                          className="error-message"
                          component="div"
                          />
                      </div>

                      <div className="remove" onClick={() => {handleRemove(remove, optionIndex)}}>Remove</div> 
                    </div>
                    
                  )}
                  
                </>
              } 
            
            </FieldArray>

          </div> 

          {typeof errors.options === "string" && (
            <div className="error-message">{errors.options}</div>
          )}

          <div className="buttonPair button-pair-exception">
            <div onClick={() => { handleAdd(setFieldValue, "options", values)}} className="button">+ option</div>
            <button 
              className="button"
              type="submit"
              style={{color: 'crimson'}}
              disabled={isSubmitting}
            >{isSubmitting? "saving question..." : "save question"}</button>
          </div>
          { status && <div className="error-message">{status}</div>}
                 
   

        </Form>
      }
    </Formik>
    
    <small className="listItem">
      
      <ul>
        <h4>Supported links:</h4>
        <li><strong>Video:</strong> YouTube — copy the link from the Share button.</li>
        <li><strong>Audio:</strong> Google Drive, Dropbox, or Vocaroo — copy the shareable link from each site.</li>
        <li><strong>Image:</strong> Giphy, Imgur, or Google Drive — copy the page URL. For most other sites like Tenor, 
        right-click the image itself and choose "Copy image address" instead of copying the page URL.</li>
      </ul>
    </small>    
    </div>
  )
}  