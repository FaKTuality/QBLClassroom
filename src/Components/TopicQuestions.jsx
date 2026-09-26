import { getDocs, deleteDoc, collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"
import { TopicConfig } from "./TopicConfig";
import { Notif } from "./Notif";
import { db } from "../../Firebase/index.js";
import { RevolvingDot } from "react-loader-spinner";
import { useNameChange, useTopicChange } from "../Hooks";
import GoogleAds from "./AdComponent.jsx"; 
import { useSelector } from "react-redux";
import { useAuth } from "../store/authProvider.jsx";
import { getDirectImageUrl, getAudioEmbed, getVideoEmbed, errorMessages, parseCode, parseName, parseTopic } from "../Helpers/index.jsx";








export const TopicQuestions = ( )=> {
  const { currentUser: user, loading: authLoading} = useAuth()
  const tutorId = user?.uid
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const topicInfo = location.state;
  const { topicName, tutorView } = topicInfo; 
  const [ questionNo, setQuestionNo ] = useState(null); 
  const [ deletingErr, setDeletingErr ] = useState(false); 
  const [ deletingTV, setDeletingTV ] = useState(false); 
  const [selected, setSelected] = useState('')
  const [responseInfo, setResponseInfo] = useState(null);
  const [ showNotif, setShowNotif ] = useState(false); 
  const [ showNotif2, setShowNotif2 ] = useState(false); 
  const [ showModal, setShowModal ] = useState(false); 
  const [ showModal2, setShowModal2 ] = useState(false); 
  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [ querySnap, setQuerySnap ] = useState([]); 
  const [ deleting, setDeleting ] = useState(false); 
  const [ editing, setEditing ] = useState(false); 
  const [ update, setUpdate ] = useState(); 
  const [ showOptions, setShowOptions ] = useState({
    id: null,
    show: null,
  });
  const [ showMedia, setShowMedia ] = useState(false); 
  const changedNames = useNameChange(); 
  const changedTopics = useTopicChange(); 
  const [ ClassRoomStatus, setClassStatus ] = useState(null); 
  
  
  useEffect(() => {
    
    if(!tutorView) {
      const docRef = doc(db, "users", topicInfo.studentId, "classRoomState", topicInfo.topicName);
      var unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setClassStatus({
            inClass: docSnap.data()?.inClass, 
            inSession: docSnap.data()?.inSession, 
          })
        }
      });        
    }
  
    const fetchQuestions = async () => {
      try {
        setError(null)
        const colRef = collection(db, `users/${topicInfo.studentId}/topics/${topicInfo.topicName}/questions`);
        const querySnap = await getDocs(colRef);         
        setQuerySnap(querySnap); 
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

    const fetchQuestionsTV = async () => {
      try {
        setError(null)
        const colRef = collection(db, `admin/${tutorId}/topics/${topicName}/questions`);
        const querySnap = await getDocs(colRef) ;
         
        setQuerySnap(querySnap); 
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

    tutorView? fetchQuestionsTV() : fetchQuestions(); 
    return unsubscribe; 
  }, [topicInfo.studentId, topicInfo.topicName, showModal, showNotif])

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
  if (error) {
    return <p className="center_piece">{error}</p>
  }




  const handleEdit = (questionInfo) => {
    if(!ClassRoomStatus?.inSession) {
      const topicConfigSerial = JSON.stringify({ 
        topicName: topicInfo.topicName,
        students: topicInfo.students, 
        studentId: topicInfo.studentId,
        name: topicInfo.name, 
        isEditing: true,
      })
      console.log(topicInfo.students)
      localStorage.setItem("topicConfig", topicConfigSerial);
      const questionInfoSerial = JSON.stringify(questionInfo); 
      localStorage.setItem('questionInfo', questionInfoSerial);
      setEditing(true);       
    } else {
      setShowNotif2(true); 
    }
    
  }

  const handleDelete = async (questionNumber) => {
    if(!ClassRoomStatus?.inSession) {
      const topicConfigSerial = JSON.stringify({ 
        topicName: topicInfo.topicName,
        students: topicInfo.students,
        isDeleting: true,
      })
      localStorage.setItem("topicConfig", topicConfigSerial);    
      const questionInfoSerial = JSON.stringify({ questionNumber })
      localStorage.setItem('questionInfo', questionInfoSerial)
      setDeleting(true); 
    } else {
      setShowNotif2(true); 
    }
  }


  const handleEditTV = (questionInfo) => {
    const questionState = {
      topicName,
      isEditing: true,
      ...questionInfo, 
    }
    navigate('/navtut/questionFormTV', { state: questionState})    
  };

  const handleDeleteTV = async () => {
    setDeletingErr(false); 
    try {
      setDeletingTV(true); 
      const docRef = doc(db, "admin", tutorId, "topics", topicName, "questions", questionNo)
      await deleteDoc(docRef); 
      setShowModal2(false)
      setShowNotif(true); 
    } catch(e) {
      setDeletingErr(
        !navigator.onLine
        ? "You're currently offline. Please reconnect to the internet and try again."
        : errorMessages[e.code] ?? "Something went wrong. Please try again."        
      )      
    } finally {
      setDeletingTV(false); 
    }
  }

  const confirmDelete = (questionNumber) => {
    setQuestionNo(questionNumber); 
    setShowModal2(true); 
  }



  const handleShowOptions = (questionNumber) => {
    setShowOptions({
      id: questionNumber, 
      show: showOptions.id === questionNumber || showOptions.show === null ? !showOptions.show : showOptions.show

    })
  }

  const randomClick = () => {
    setShowOptions({
      id: null, 
      show: showOptions.show, 
    }
    )
  }


  const handleClick = (option) => {
    setResponseInfo({
      responseType: option.responseType,
      responsePayload: option.responsePayload,
    });

    setSelected(option.text)
    setShowMedia(true);

  };


  return(
    <>
      <div className="center_piece">
      <div style={{display: "flex", flexDirection: 'column', gap: "0px"}}>
        {!tutorView && <h3 className="centered">Questions for <span className="centered" style={{color: "darkorange"}}>{parseName(topicInfo.name, topicInfo.studentId , changedNames)}</span></h3> }
        { tutorView && <h3 className="centered">Questions under <span className="centered" style={{color: "darkorange"}}>{parseName(topicInfo.name, topicInfo.studentId , changedNames)}</span></h3>}
        <h3 className="centered" style={{color: "darkorange"}}>{parseCode(parseTopic(topicInfo.topicName, changedTopics))}</h3>
        {!tutorView && ClassRoomStatus?.inClass && <h4 style={{color: 'green'}} className="centered">{parseName(topicInfo.name, topicInfo.studentId , changedNames)} is in class</h4>}
        {!tutorView && !ClassRoomStatus?.inClass && <h4 style={{color: 'red'}} className="centered">{parseName(topicInfo.name, topicInfo.studentId , changedNames)} is not in class</h4>}
        {!tutorView && !ClassRoomStatus?.inClass && ClassRoomStatus?.inSession && <h4 style={{color: 'green'}} className="centered">In session</h4>}
        {tutorView && <h4 style={{color: 'darkorange'}} className="centered">New students receive these questions</h4>}
      </div>        
        
        {showNotif && <Notif operation={"delete"} setShowNotif={setShowNotif}/>}     
        {showNotif2 && <Notif operation={"in-class"} setShowNotif={setShowNotif2}/>} 
        {querySnap.docs.length === 0 ? 
        <p className="centered">No questions have been added to this topic</p>
      
      
      :querySnap.docs.map((docSnap, index)=> {

          const additionalMediaLink = docSnap.data().additionalMediaLink
          const additionalMediaType = docSnap.data().additionalMediaType
        
           
          return(
            <div key={docSnap.id}>
              <div className="question-details" onClick={randomClick}>
                <div className="three-dots"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleShowOptions(docSnap.id)
                  }}
                >⋮</div>
                <div className="q-number">{ `question ${index + 1}` }</div>
                { additionalMediaType === 'video' && 
                  <video 
                    className="q-media" 
                    src={additionalMediaLink} controls/>
                }

                { additionalMediaType === "image" && 
                  <img 
                    className="q-media centered" 
                    src={additionalMediaLink} />}

                { additionalMediaType === "audio" && 
                  <audio 
                    className="q-media"
                    src={additionalMediaLink} 
                    controls/>}
                <div className="q-text">{parseCode(docSnap.data().questionText)}</div>
                <ul className="list">
                  { docSnap.data().options.map((option) => { 
                    return (<li key={option.text} 
                      className={`option flex-hori-no-center`} style={{cursor: 'pointer'}} 
                      onClick={() => handleClick(option)}><span className="response-type">{option.responseType}</span>&nbsp;
                    <span className={`option-text ${selected === option.text && 'selected-option'}`}>{parseCode(option.text)}</span></li>)
                  })}
                </ul>
                <div className={` ${showOptions.id === docSnap.id && showOptions.show ? 'action-group' : 'hidden'}`}>
                  <div className="action" 
                  onClick={tutorView ? () => handleEditTV({ questionData: docSnap.data(), questionNumber: docSnap.id}) : 
                  ()=> {handleEdit({ questionData: docSnap.data(), questionNumber: docSnap.id})}}>Edit</div>
                  <div className="action" 
                  onClick={tutorView ? () => confirmDelete(docSnap.id) : () => {handleDelete(docSnap.id)}}>Delete</div>
                </div>                
              </div>

          </div> 
          )}
        )}

         {editing && <TopicConfig setShowModal={setEditing} setShowNotif={setShowNotif} setQuerySnap={setQuerySnap} editing={true} />  }
         {deleting && <TopicConfig setShowModal={setDeleting} setShowNotif={setShowNotif} setQuerySnap={setQuerySnap} deletingQuestion={true} />  }
      {showMedia && responseInfo && (
        <div className="modal" onClick={() => setShowMedia(false)}>
          <div
            className="modal-content-media"
            onClick={(e) => e.stopPropagation()}
          >

            {responseInfo.responseType === "text" && (
              <p className="centered">{parseCode(responseInfo.responsePayload)}</p>
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

      { showModal2 && 
      <div className="modal">
        <div className="modal-content">
          <div onClick={() => setShowModal2(false)} className="close-modal">&times;</div>
          <h4 className="header-centered">Confirm Delete</h4>
          <p>Are you sure you want to delete this question?</p>
          <button 
            disabled={deletingTV}
            onClick={handleDeleteTV} className="button centered">{deletingTV ? 'deleting...' : 'Confirm'}</button>
            {deletingErr && <p className="error-message">{deletingErr}</p>}
            
        </div>
      </div>}       

      </div>
    </>
  )
}


// getYouTubeEmbedUrl(responseInfo.responsePayload, { autoplay: true, controls: false})