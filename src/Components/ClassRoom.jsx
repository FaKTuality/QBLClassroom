import { collection, doc, getDocs,getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { db } from "../../Firebase/index.js";
import { useAuth } from "../store/authProvider";
import { Notif } from "./Notif";
import { RevolvingDot } from "react-loader-spinner";
import { useTopicChange } from "../Hooks";
import { FaDoorOpen } from "react-icons/fa";
import { getAudioEmbed, getDirectImageUrl, getVideoEmbed, parseCode, parseTopic, errorMessages } from "../Helpers/index.jsx";


export const ClassRoom = () => {
  
  const location = useLocation();
  const topicName = location.state?.topicName;  
  const LQN = location.state?.LQN 
  const studentName = location.state?.studentName
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true);
  const [notifOperation, setNotifOperation] = useState("submit-answers");
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responseInfo, setResponseInfo] = useState(null);
  const [counter, setCounter] = useState(LQN || 0);
  const [showModal, setShowModal ] = useState(false); 
  const [showNotif, setShowNotif] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [ shuffle, setShuffle ] = useState(false); 
  const storedQNoArr = localStorage.getItem(`qNoArr${topicName}`)
  const [ qNoArr, setQNoArr ] = useState(storedQNoArr ? JSON.parse(storedQNoArr) : []);  
  const bookmark = localStorage.getItem(`${qNoArr[counter]}${topicName}`) || null;
  const chosenOption = bookmark? JSON.parse(bookmark).chosenOption : null; 
  const { currentUser: user, loading: authLoading } = useAuth();
  const studentId = user?.uid;

  const lastIndex = questions.length - 1;
  const finalQuestion = counter === lastIndex;
  const changedTopics = useTopicChange(); 
  const [ givingUp, setGivingUp ] = useState(false); 
  const [lastSelectionTime, setLastSelectionTime] = useState(0);
  const SELECTION_COOLDOWN = 80000;


const fisherYates = (array) => {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // destructuring assignment
  }

  return shuffled;
};



  useEffect(() => {
    if (!studentId || !topicName) return;

    const fetchQuestions = async () => {
    
      try {
        setError(null);
        const docRef = doc(db, "users", studentId, "topics", topicName)
        const colRef = collection(
          db,
          `users/${studentId}/topics/${topicName}/questions`
        );

        const [querySnap, docSnap] = await Promise.all([getDocs(colRef), getDoc(docRef)]);
        querySnap.docs.length === LQN && setCounter(LQN - 1); 
        if(docSnap.data().shuffle) {
          let randomized = fisherYates(querySnap.docs)
          if(qNoArr.length === 0){
            const randomizedArr = randomized.map((docSnap) => docSnap.id)
            setQNoArr(randomizedArr)
            localStorage.setItem(`qNoArr${topicName}`, JSON.stringify(randomizedArr))            
          } else {
            randomized = qNoArr.map((qNo, index) => randomized.find((docSnap) => docSnap.id === qNo))
                        
          }
          setQuestions(randomized)
        }else {
          let sequential = querySnap.docs
          if(qNoArr.length === 0) {
            const sequentialArr = sequential.map((docSnap) => docSnap.id)
            setQNoArr(sequentialArr)
            localStorage.setItem(`qNoArr${topicName}`, JSON.stringify(sequentialArr))          
          } else {
            sequential = qNoArr.map((qNo, index) => sequential.find((docSnap) => docSnap.id === qNo))
            
          }
          setQuestions(sequential);
        }
        setShuffle(docSnap.data().shuffle)  
      } catch (e) {
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        ); 
      } finally {
        setLoading(false);
      }
    };

      fetchQuestions();

    
  }, [studentId, topicName]);




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
    return <p className="center_piece">{error}</p>;
  }

  const openModal = () => setShowModal(true);

  const closeModal = () => setShowModal(false);

  const handleClick = (question, option, questionNumber) => {
    if (option.text !== chosenOption && Date.now() - lastSelectionTime < SELECTION_COOLDOWN) {
      setNotifOperation("not-so-fast");
      setShowNotif(true);
      return;
    }

    setLastSelectionTime(Date.now());

    setResponseInfo({
      responseType: option.responseType,
      responsePayload: option.responsePayload,
    });

    
    openModal();

    const answeredQuestion = {
      ...question,
      chosenOption: option.text,
      responseType: option.responseType,
    };

    localStorage.setItem(
      `${questionNumber}${topicName}`,
      JSON.stringify(answeredQuestion)
    );

    localStorage.setItem(`LQN${topicName}`,counter+1)

    
  };

  const handleSubmit = async () => {
    const storedItem = localStorage.getItem(`${questionNumber}${topicName}`)
    
    if(storedItem === null) {
      alert("select an option first")
      return; 
    }
    setSubmitting(true);
    const submittedAt = serverTimestamp(); 
    const attemptedQuestions = [];

    questions.forEach((docSnap) => {
      const storedItem = localStorage.getItem(`${docSnap.id}${topicName}`);
      const storedQuestion = storedItem ? JSON.parse(storedItem) : {};

      attemptedQuestions.push({
        ...storedQuestion,
        questionNumber: docSnap.id,
        createdAt: submittedAt
      });
    });



    try {
      setSubmitError(null);

      await Promise.all(
        attemptedQuestions.map((question) =>
          setDoc(
            doc(
              db,
              `users/${studentId}/topics/${topicName}/submissions/${question.questionNumber}`
            ),
            question
          )
        )
      );
    questions.forEach((docSnap) => {
        localStorage.removeItem(`${docSnap.id}${topicName}`)
    });

    const docRef = doc(db, "users", studentId, "classRoomState", topicName, );
    await setDoc(docRef,{ inClass: false, inSession: false}, { merge: true });    
    localStorage.removeItem(`LQN${topicName}`)
    localStorage.removeItem('qNoArr')     

      setShowNotif(true);
      setTimeout(() => {
        navigate("/navstu/viewtopicsstudent", { state: { userId: studentId, studentName, }});        
      }, 1000)
  
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = (questionNumber) => {
    const storedItem = localStorage.getItem(`${questionNumber}${topicName}`)
    
    if(storedItem === null) {
      alert("select an option first")
      return; 
    }
    if (!finalQuestion) {
      setCounter((prev) => prev + 1);
      setResponseInfo(null);
      setShowModal(false);
      
    }
  };

  const previous = (questionNumber) => {
    if (counter !== 0) {
      setCounter((prev) => prev - 1);
      setResponseInfo(null);
      setShowModal(false);
      
    }
  };

  const handleGiveUp = async() => {
    setSubmitError(null); 
    try {
      setGivingUp(true); 
      const docRef = doc(db, "users", studentId, "classRoomState", topicName, );
      await setDoc(docRef,{ inClass: false, inSession: true }, { merge: true });   
      navigate("/navstu/viewtopicsstudent", { state: { userId: studentId, studentName, }}); 
    } catch(e) {
      setSubmitError(
        !navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[e.code] ?? "Something went wrong. Please try again."        
      );
    } finally {
      setGivingUp(false); 
    }
       
  }

  const docSnap = questions[counter];
  const question = docSnap?.data();

  if (!question) return (<div className="center_piece">There are no questions yet. </div>);

  const { additionalMediaType, additionalMediaLink } = question;

  return (
    <>
        
    <div className="center_piece relative" style={{marginTop: '7px'}}>
      <button className="button give-up" style={{color: "red"}} disabled={givingUp} onClick={handleGiveUp}>
        <FaDoorOpen/>
        <span>{givingUp ? 'Giving Up...' : 'Give Up'}</span>
      </button>
      {showNotif && (
        <Notif
          operation={notifOperation}
          setShowNotif={setShowNotif}
        />
      )}


      {submitError && (
        <p className="error-message centered">{submitError}</p>
      )}

      <h2 className="centered" style={{color: "darkorange"}}>{parseCode(parseTopic(topicName, changedTopics))}</h2>

      <div className="question-details">
        <div className="q-number">
          Question {counter + 1} of {questions.length}
        </div>

            {additionalMediaType === "video" && (() => {
              const video = getVideoEmbed(additionalMediaLink);
              if (!video) return null;

              return video.type === "iframe" ? (
                <iframe
                  width="100%"
                  height="400"
                  src={video.url}
                  title="Video player"
                  frameBorder="0"
                />
              ) : (
                <video
                  width="100%"
                  height="100%"
                  src={video.url}
                  controls
                />
              );
            })()} 

        {additionalMediaType === "image" && (
          <img
            className="q-media centered"
            src={getDirectImageUrl(additionalMediaLink)}
            alt=""
          />
        )}


            {additionalMediaType === "audio" && (() => {
              const audio = getAudioEmbed(additionalMediaLink);
              if (!audio) return null;

              return audio.type === "iframe" ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={audio.url}
                  title="Audio player"
                  frameBorder="0"
                />
              ) : (
                <audio src={audio.url} controls />
              );
            })()}

        <div className="q-text">{parseCode(question.questionText)}</div>

        <ul className="list">
          {question.options.map((option) => (
            <li
              key={option.text}
              className="listItem"
              style={{ cursor: "pointer" }}
              onClick={() =>
                handleClick(question, option, docSnap.id)
              }
            >
              <span
                className={`option-text ${
                  chosenOption === option.text
                    ? "selected-option"
                    : ""
                }`}
              >
                {parseCode(option.text)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {showModal && responseInfo && (
        <div className="modal" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >


            {responseInfo.responseType === "text" && (
              <div><div>{parseCode(responseInfo.responsePayload)}</div></div>
            )}

            {responseInfo.responseType === "image" && (
              <img
                className="q-media"
                src={getDirectImageUrl(responseInfo.responsePayload)}
                alt=""
              />
            )}

            {responseInfo.responseType === "video" && (() => {
              const video = getVideoEmbed(responseInfo.responsePayload);
              if (!video) return null;

              return video.type === "iframe" ? (
                <iframe
                  width="100%"
                  height="400"
                  src={video.url}
                  title="Video player"
                  frameBorder="0"
                />
              ) : (
                <video
                  width="100%"
                  height="100%"
                  src={video.url}
                  controls
                />
              );
            })()}    

            {responseInfo.responseType === "audio" && (() => {
              const audio = getAudioEmbed(responseInfo.responsePayload);
              if (!audio) return null;

              return audio.type === "iframe" ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={audio.url}
                  title="Audio player"
                  frameBorder="0"
                />
              ) : (
                <audio src={audio.url} controls />
              );
            })()}
          </div>
        </div>
      )}

      <div className="buttonPair button-pair-exception">
        <button
          className="button"
          onClick={() => previous(docSnap.id)}
          disabled={counter === 0}
        >
          Previous
        </button>

        {!finalQuestion ? (
          <button
            className="button"
            onClick={() => next(docSnap.id)}
          >
            Next
          </button>
        ) : (
          <button
            className="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
    </>
  );
};







