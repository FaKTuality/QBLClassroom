
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
import { useNavigate } from "react-router-dom";
import { useTopicChange, useNameChange } from "../Hooks";
import { errorMessages, parseTopic, parseCode, parseName } from "../Helpers/index.jsx";
import { useFormikContext } from "formik";



const DraftAutosave = () => {
  const { values } = useFormikContext();
 
  useEffect(() => {
    localStorage.setItem('questionDraft', JSON.stringify(values));
  }, [values]);
 
  return null;
};



export const QuestionForm = () => {
  const { currentUser: user, loading: authLoading} = useAuth()
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ showNotif2, setShowNotif2 ] = useState(false); 
  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [questionInfo] = useState(JSON.parse(localStorage.getItem('questionInfo')));
  const { questionNumber, questionData } = questionInfo || {};   
  const [ topicConfig, setTopicConfig ] = useState(JSON.parse(localStorage.getItem('topicConfig') || "null") );
  const { studentId, name, students, topicName } = topicConfig || {};
  const [ bookmark, setBookmark ] = useState(null)
  const [ navBack ] = useState(JSON.parse(localStorage.getItem('navBack') || "null") )
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
    const getTopicConfig = async () => {
      const colRef = collection(db, `admin/${tutorId}/topics`)
      const q = query(colRef, orderBy('createdAt', 'asc'))
      let result = topicConfig; 
      
      try {
        if(!result){
          const topics = await getDocs(q)  
          result = topics.docs[topics.docs.length - 1]?.data(); 
          setTopicConfig(result);
          
        } 
        const docSnap = await getDoc(doc(db, "admin", tutorId, "LQN", result.topicName))
        docSnap.exists() ? setBookmark(docSnap.data().last) : setBookmark(1);  
        setLoading(false);
        console.log('breakage3')
      } catch(e) {
        setError(!navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[e.code] ?? "Something went wrong. Please try again.")
      }
    }

    if(topicConfig?.isEditing) {
      setLoading(false)
    } else {
      getTopicConfig(); 
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
    

const GIPHY_API_KEY = "BLqobpfJuXnhksEpqt6qynVVXYGo8I7O"; // see note below

const resolveGiphyVideoUrl = async (url) => {
  console.log("resolveGiphyVideo running")
  if (!url || typeof url !== "string") return url;

  const giphyMediaRegex = /^https?:\/\/media\d*\.giphy\.com\/media\/.+\/([a-zA-Z0-9]+)\/giphy\.(?:gif|webp|mp4)$/i;
  const match = url.match(giphyMediaRegex);
  if (!match) return url; // not a Giphy link — leave untouched

  const giphyId = match[1];
  try {
    console.log('calling giphy API')
    const res = await fetch(`https://api.giphy.com/v1/gifs/${giphyId}?api_key=${GIPHY_API_KEY}`);
    const json = await res.json();
    const soundUrl = json?.data?.video?.assets?.["480p"]?.url;
    console.log('soundUrl', soundUrl)
    return soundUrl || url; // fall back to original if it's a plain GIF (no video object) or lookup fails

  } catch {
    return url; // network/API failure — don't block saving over this
  }
};
  
  const handleSubmit = async (values, { resetForm, setStatus, setSubmitting }) => {
    if (!navigator.onLine) {
        setStatus("You're currently offline. Please reconnect to the internet and try again.");
        setSubmitting(false);
        return;
    }         
    setStatus(null); 
    try{    
    const newValues = !values.additionalMediaType && values.additionalMediaLink ? {...values, additionalMediaLink: ''}: values;



    const resolvedOptions = await Promise.all(
      newValues.options.map(async (option) =>
        option.responseType === "video"
          ? { ...option, responsePayload: await resolveGiphyVideoUrl(option.responsePayload) }
          : option
      )
    );
    const finalValues = { ...newValues, options: resolvedOptions };

    const saveQuestion = async (student, index, questionNumber) => { 
      let docRef; 
      if(topicConfig?.isEditing){
        docRef = doc(db, `users/${student.studentId}/topics/${topicName}/questions/${questionNumber}`)
      } else {
        console.log("THIS IS QUESTIONNuMbEr", questionNumber); 
        docRef = doc(db, `users/${student.studentId}/topics/${topicName}/questions/question${String(bookmark).padStart(4, "0")}`)
      } 
      return Promise.all([
        setDoc(docRef, finalValues), 
        !topicConfig.isEditing && setDoc(doc(db, `admin/${tutorId}/topics/${topicName}/questions/question${String(bookmark).padStart(4, "0")}`), finalValues), 
        setDoc(doc(db, `users/${student.studentId}/topics/${topicName}`),{ createdAt: serverTimestamp()})
      ]) ; 
    }
   
    const studentPromises = students.map((student, index)=> saveQuestion(student,index, questionNumber))
    
      await Promise.all(studentPromises)
      topicConfig?.isEditing ? resetForm({ values: {
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
        
      if(topicConfig?.isEditing) {
          localStorage.removeItem("topicConfig")
          localStorage.removeItem("questionInfo")  
          localStorage.removeItem("navBack")    
          setShowNotif2(true);     
          setTimeout(() => {
            navigate('/navtut/topicquestions', { state: { studentId, topicName, students: navBack, name } })
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
        <h2 className="header-centered" style={{color: 'darkorange'}}>{parseCode(parseTopic(topicName, changedTopics))}</h2>
        {name && 
        <h3 className="header-centered" style={{color: 'darkorange'}}>
          Editing for {parseName(name, studentId, changedNames)[0].toUpperCase() + parseName(name, studentId, changedNames).slice(1)}
        
        </h3>}
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
      
      <ul className="supported-links">
        <h4>Supported links:</h4>
        <li>
          <strong>Video:</strong> YouTube (copy the link from the Share button), Google Drive, Dropbox, or Giphy Clips.
        </li>
        <li>
          <strong>Audio:</strong> Google Drive, Dropbox, or Vocaroo. Copy the shareable link from each site.
        </li>
        <li>
          <strong>Image:</strong> Google Drive, Dropbox, or Giphy. Copy the shareable or page link from each site.
        </li>
      </ul>
    </small>    
    </div>
  )
}  

